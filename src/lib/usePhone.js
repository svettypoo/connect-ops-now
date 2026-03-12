import { useState, useRef, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { TelnyxRTC } from "@telnyx/webrtc";
import api from "@/api/inboxAiClient";
import { startRingtone, stopRingtone } from "@/lib/useNotificationSettings";
import { callEventEmitter } from "@/lib/pushNotifications";

const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_BASE || 'https://phone.stproperties.com')
  : '';

function getNotifSettings() {
  try {
    const raw = localStorage.getItem("con_notif_settings");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function checkMicPermission() {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state;
  } catch {
    return 'prompt';
  }
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (e) {
    console.warn("[Phone] Mic permission denied:", e.message);
    return false;
  }
}

export function usePhone() {
  const [status, setStatus]           = useState("idle");
  const [activeName, setActiveName]   = useState("");
  const [activeNumber, setActiveNumber] = useState("");
  const [elapsed, setElapsed]         = useState(0);
  const [isMuted, setIsMuted]         = useState(false);
  const [isOnHold, setIsOnHold]       = useState(false);
  const [inboundCall, setInboundCall] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [callControlId, setCallControlId] = useState(null);
  const [micDenied, setMicDenied]     = useState(false);
  const [micStatus, setMicStatus]     = useState('prompt');
  const [isRecording, setIsRecording] = useState(false);

  const clientRef     = useRef(null);
  const callRef       = useRef(null);
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(null);
  const mountedRef    = useRef(true);
  const remoteAudioRef = useRef(null);
  const configRef     = useRef(null);
  const recorderRef   = useRef(null);
  const recChunksRef  = useRef([]);
  const recContextRef = useRef(null);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); };

  const ensureAudioElement = () => {
    if (!remoteAudioRef.current) {
      let el = document.getElementById('sip-remote-audio');
      if (!el) {
        el = document.createElement('audio');
        el.id = 'sip-remote-audio';
        el.autoplay = true;
        el.setAttribute('playsinline', '');
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      remoteAudioRef.current = el;
    }
    return remoteAudioRef.current;
  };

  const attachRemoteAudio = (call) => {
    const audioEl = ensureAudioElement();
    if (call.remoteStream) {
      audioEl.srcObject = call.remoteStream;
      audioEl.play().catch(() => {});
      console.log('[Phone] Remote audio attached');
    }
  };

  const resetCallState = () => {
    callRef.current = null;
    stopTimer();
    setElapsed(0);
    setIsMuted(false);
    setIsOnHold(false);
    setActiveName("");
    setActiveNumber("");
    setInboundCall(null);
    setCallControlId(null);
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  // ── Core init ──────────────────────────────────────────────────────────────
  const initTelnyx = useCallback(async (config) => {
    if (!mountedRef.current) return;

    // Tear down existing client
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }

    ensureAudioElement();

    const client = new TelnyxRTC({
      login_token: config.login_token,
    });

    clientRef.current = client;

    client.on('telnyx.ready', () => {
      if (!mountedRef.current) return;
      console.log('[Phone] Telnyx WebRTC ready');
      setStatus('ready');
    });

    client.on('telnyx.error', (err) => {
      if (!mountedRef.current) return;
      console.error('[Phone] Telnyx error:', err);
      setStatus('idle');
      // Token expired — reconnect with fresh token
      setTimeout(async () => {
        if (!mountedRef.current) return;
        try {
          const newConfig = await api.getSipConfig();
          if (!newConfig?.login_token || !mountedRef.current) return;
          configRef.current = newConfig;
          setPhoneNumber(newConfig.phone_number);
          setStatus('connecting');
          await initTelnyx(newConfig);
        } catch {}
      }, 5000);
    });

    client.on('telnyx.notification', (notification) => {
      if (!mountedRef.current) return;
      if (notification.type !== 'callUpdate') return;

      const call = notification.call;
      const state = call.state;
      const direction = call.direction; // 'inbound' | 'outbound'

      console.log('[Phone] call update:', direction, state);

      callRef.current = call;

      if (state === 'ringing' && direction === 'inbound') {
        // Inbound call arriving
        const from = call.options?.remoteCallerNumber || call.options?.destinationNumber || 'Unknown';
        const name = call.options?.remoteCallerName || from;
        setInboundCall({ name, number: from });
        setCallControlId(call.id || null);
        setStatus('ringing');
        startRingtone({ ringOnCall: true, ringtone: 'classic', ringVolume: 80, vibrateOnCall: true, ...getNotifSettings() });
        if (Notification?.permission === 'granted') {
          new Notification('Incoming Call', { body: name, icon: '/favicon.ico', tag: 'incoming-call', renotify: false });
        }
        return;
      }

      if (state === 'active') {
        stopRingtone();
        setInboundCall(null);
        setStatus('active');
        startTimer();
        attachRemoteAudio(call);
        return;
      }

      if (state === 'held') {
        setIsOnHold(true);
        setStatus('held');
        return;
      }

      if (state === 'hangup' || state === 'destroy' || state === 'purge') {
        stopRingtone();
        // Stop recording if active
        if (recorderRef.current) {
          try { recorderRef.current.stop(); } catch {}
          recorderRef.current = null;
          setIsRecording(false);
        }
        setStatus('ready');
        resetCallState();
        return;
      }

      // Outbound ringing state (early/requesting/new)
      if (direction === 'outbound' && (state === 'new' || state === 'requesting' || state === 'early')) {
        setStatus('calling');
        return;
      }
    });

    try {
      await client.connect();
    } catch (e) {
      console.error('[Phone] TelnyxRTC connect failed:', e.message);
      setStatus('idle');
    }
  }, []);

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        if (!Capacitor.isNativePlatform()) {
          const permState = await checkMicPermission();
          if (mountedRef.current) setMicStatus(permState);
          if (permState === 'denied') {
            setMicDenied(true);
            setStatus('idle');
            return;
          }
        }

        if (Capacitor.isNativePlatform()) {
          const ok = await ensureMicPermission();
          if (!ok) {
            setMicDenied(true);
            setMicStatus('denied');
            setStatus('idle');
            return;
          }
        }

        const config = await api.getSipConfig();
        if (!config?.login_token || !mountedRef.current) return;
        configRef.current = config;
        setPhoneNumber(config.phone_number);
        setStatus('connecting');
        await initTelnyx(config);
      } catch (e) {
        console.warn('[Phone] init error:', e.message);
        if (!mountedRef.current) return;
        if (e.message?.includes('401') || e.message?.includes('Not authenticated') || e.message?.includes('Session expired')) {
          localStorage.removeItem('con_session_token');
          window.location.reload();
          return;
        }
        setStatus('idle');
      }
    })();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mountedRef.current && configRef.current) {
        const client = clientRef.current;
        if (!client || !client.connected) {
          console.log('[Phone] visibility visible — reconnecting Telnyx');
          setStatus('connecting');
          try {
            const newConfig = await api.getSipConfig();
            if (!newConfig?.login_token || !mountedRef.current) return;
            configRef.current = newConfig;
            await initTelnyx(newConfig);
          } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleDeviceChange = async () => {
      if (!remoteAudioRef.current || !callRef.current) return;
      const savedSpk = localStorage.getItem('con_spk_id');
      if (savedSpk && typeof remoteAudioRef.current.setSinkId === 'function') {
        remoteAudioRef.current.setSinkId(savedSpk).catch(() => {});
      }
    };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      mountedRef.current = false;
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      try { clientRef.current?.disconnect(); } catch {}
    };
  }, [initTelnyx]);

  // ── FCM wake ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = async () => {
      if (!mountedRef.current) return;
      const client = clientRef.current;
      if (!client || !client.connected) {
        console.log('[Phone] FCM wake — reconnecting Telnyx');
        setStatus('connecting');
        try {
          const newConfig = await api.getSipConfig();
          if (!newConfig?.login_token || !mountedRef.current) return;
          configRef.current = newConfig;
          await initTelnyx(newConfig);
        } catch {}
      }
    };
    callEventEmitter.addEventListener('incoming_call', handler);
    return () => callEventEmitter.removeEventListener('incoming_call', handler);
  }, [initTelnyx]);

  const makeCall = useCallback(async (number, name) => {
    if (!clientRef.current) return;

    if (!Capacitor.isNativePlatform()) {
      const permState = await checkMicPermission();
      if (permState === 'prompt') {
        const ok = await ensureMicPermission();
        if (ok) setMicStatus('granted');
        else { setMicStatus('denied'); setMicDenied(true); return; }
      } else if (permState === 'denied') {
        setMicStatus('denied'); setMicDenied(true); return;
      }
    }

    // Normalize to E.164
    let dest = number.replace(/\D/g, '');
    if (dest.length === 10) dest = '1' + dest;
    if (!dest.startsWith('+')) dest = '+' + dest;

    setActiveNumber(number);
    setActiveName(name || number);
    setStatus('calling');

    try {
      const call = clientRef.current.newCall({
        destinationNumber: dest,
        callerNumber: configRef.current?.phone_number || '+15878643090',
        audio: true,
        video: false,
      });
      callRef.current = call;
      setCallControlId(call.id || null);
    } catch (e) {
      console.error('[Phone] newCall failed:', e.message);
      setStatus('ready');
    }
  }, [phoneNumber]);

  const answerCall = useCallback(() => {
    stopRingtone();
    const call = callRef.current;
    if (!call) return;
    setActiveName(inboundCall?.name || '');
    setActiveNumber(inboundCall?.number || '');
    setInboundCall(null);
    try {
      call.answer({ audio: true, video: false });
    } catch (e) {
      console.error('[Phone] answer failed:', e.message);
    }
  }, [inboundCall]);

  const hangup = useCallback(() => {
    stopRingtone();
    const call = callRef.current;
    if (call) {
      try { call.hangup(); } catch {}
    }
    // Stop recording if active
    if (recorderRef.current) {
      try { recorderRef.current.stop(); } catch {}
      recorderRef.current = null;
      setIsRecording(false);
    }
    setStatus('ready');
    resetCallState();
  }, []);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    if (isMuted) {
      call.unmuteAudio();
    } else {
      call.muteAudio();
    }
    setIsMuted(m => !m);
  }, [isMuted]);

  const toggleHold = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    if (isOnHold) {
      call.unhold();
      setIsOnHold(false);
      setStatus('active');
    } else {
      call.hold();
      setIsOnHold(true);
      setStatus('held');
    }
  }, [isOnHold]);

  const sendDtmf = useCallback((digit) => {
    const call = callRef.current;
    if (!call) return;
    try { call.dtmf(digit); } catch {}
  }, []);

  const blindTransfer = useCallback((dest) => {
    // Telnyx WebRTC SDK doesn't support direct SIP REFER — hang up after transfer
    // For full transfer, use Telnyx Call Control API via server
    hangup();
  }, [hangup]);

  // ── Recording (client-side via remoteStream + localStream) ─────────────────
  const startRecording = useCallback(() => {
    const call = callRef.current;
    if (!call || recorderRef.current) return;

    try {
      const ctx = new AudioContext();
      recContextRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();

      if (call.remoteStream) {
        const remoteSrc = ctx.createMediaStreamSource(call.remoteStream);
        remoteSrc.connect(dest);
      }

      if (call.localStream) {
        const localSrc = ctx.createMediaStreamSource(call.localStream);
        localSrc.connect(dest);
      }

      recChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      console.log('[Phone] Recording started');
    } catch (e) {
      console.error('[Phone] Recording start failed:', e.message);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) { setIsRecording(false); return null; }

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        recorderRef.current = null;
        setIsRecording(false);
        if (recContextRef.current) {
          recContextRef.current.close().catch(() => {});
          recContextRef.current = null;
        }
        const blob = new Blob(recChunksRef.current, { type: recorder.mimeType });
        recChunksRef.current = [];
        console.log('[Phone] Recording stopped, blob size:', blob.size);
        if (blob.size < 1000) { resolve(null); return; }

        try {
          const formData = new FormData();
          const filename = `call_${Date.now()}.webm`;
          formData.append('recording', blob, filename);
          formData.append('from_number', phoneNumber || '');
          formData.append('to_number', activeNumber || '');
          formData.append('duration', String(elapsed));
          const headers = {};
          if (Capacitor.isNativePlatform()) {
            const token = localStorage.getItem('con_session_token');
            if (token) headers['x-session'] = token;
          }
          const resp = await fetch(API_BASE + '/api/phone/upload-recording', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: formData,
          });
          const data = await resp.json();
          console.log('[Phone] Recording uploaded:', data);
          resolve(data);
        } catch (e) {
          console.error('[Phone] Recording upload failed:', e.message);
          resolve(null);
        }
      };
      recorder.stop();
    });
  }, [phoneNumber, activeNumber, elapsed]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const fmtElapsed = () => {
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  return {
    status, activeName, activeNumber, elapsed, fmtElapsed,
    isMuted, isOnHold, inboundCall, phoneNumber, callControlId, micDenied, micStatus,
    isRecording, startRecording, stopRecording, toggleRecording,
    makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer,
  };
}
