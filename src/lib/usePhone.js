import { useState, useRef, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { TelnyxRTC } from "@telnyx/webrtc";
import { startRingtone, stopRingtone } from "@/lib/useNotificationSettings";
import { callEventEmitter } from "@/lib/pushNotifications";
import api from "@/api/inboxAiClient";

// ─── Mic permission helpers ───────────────────────────────────────────────────

async function checkMicPermission() {
  try { return (await navigator.permissions.query({ name: 'microphone' })).state; }
  catch { return 'prompt'; }
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => t.stop());
    return true;
  } catch { return false; }
}

function getServerBase() {
  if (Capacitor.isNativePlatform()) return 'https://phone.stproperties.com';
  return '';
}

// ─── usePhone hook ────────────────────────────────────────────────────────────

export function usePhone() {
  const [status,        setStatus]        = useState('idle');
  const [activeName,    setActiveName]    = useState('');
  const [activeNumber,  setActiveNumber]  = useState('');
  const [elapsed,       setElapsed]       = useState(0);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isOnHold,      setIsOnHold]      = useState(false);
  const [inboundCall,   setInboundCall]   = useState(null);
  const [phoneNumber]                     = useState('+15878643090');
  const [micDenied,     setMicDenied]     = useState(false);
  const [micStatus,     setMicStatus]     = useState('prompt');
  const [lastError,     setLastError]     = useState(null);
  const [outputDevices,  setOutputDevices]  = useState([]);
  const [outputDeviceId, setOutputDeviceId] = useState('default');
  const [inputDevices,   setInputDevices]   = useState([]);
  const [inputDeviceId,  setInputDeviceId]  = useState('default');

  const clientRef       = useRef(null);
  const callRef         = useRef(null);   // active TelnyxRTC Call object
  const callMetaRef     = useRef(null);   // { direction, from, to, name, startedAt } for logging
  const remoteAudioRef  = useRef(null);   // HTMLAudioElement for remote audio
  const analyserMicRef  = useRef(null);   // AnalyserNode for mic levels
  const analyserRemRef  = useRef(null);   // AnalyserNode for remote levels
  const audioCtxRef     = useRef(null);   // AudioContext for level analysis
  const timerRef        = useRef(null);
  const startTimeRef    = useRef(null);
  const mountedRef      = useRef(true);
  const isMutedRef      = useRef(false);
  const inputDeviceIdRef = useRef('default');

  // Level refs (read by AudioLevels component via requestAnimationFrame)
  const micLevelRef    = useRef(0);
  const remoteLevelRef = useRef(0);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // ── Timer ────────────────────────────────────────────────────────────────────

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() =>
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);

  // ── Remote audio element ─────────────────────────────────────────────────────

  function getOrCreateRemoteAudio() {
    let el = document.getElementById('telnyx-remote-audio');
    if (!el) {
      el = document.createElement('audio');
      el.id = 'telnyx-remote-audio';
      el.autoplay = true;
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    remoteAudioRef.current = el;
    return el;
  }

  // ── Output device selection ───────────────────────────────────────────────────

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const outputs = all
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0,6)}` }));
      const inputs = all
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0,6)}` }));
      if (mountedRef.current) { setOutputDevices(outputs); setInputDevices(inputs); }
    } catch {}
  }

  const setOutputDevice = useCallback(async (deviceId) => {
    setOutputDeviceId(deviceId);
    const el = remoteAudioRef.current;
    if (el && typeof el.setSinkId === 'function') {
      await el.setSinkId(deviceId).catch(() => {});
    }
  }, []);

  const setInputDevice = useCallback(async (deviceId) => {
    inputDeviceIdRef.current = deviceId;
    setInputDeviceId(deviceId);
    // If there's an active call, re-apply the mic device
    const call = callRef.current;
    if (call && call.state === 'active') {
      call.setAudioInDevice(deviceId).catch(() => {});
    }
  }, []);

  // ── Level meters ─────────────────────────────────────────────────────────────

  function setupLevelMeters(remoteStream, localStream) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      if (remoteStream) {
        const src = ctx.createMediaStreamSource(remoteStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRemRef.current = analyser;
      }

      if (localStream) {
        const src = ctx.createMediaStreamSource(localStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserMicRef.current = analyser;
      }

      const buf = new Uint8Array(32);
      const tick = () => {
        if (!mountedRef.current) return;
        if (analyserMicRef.current) {
          analyserMicRef.current.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          micLevelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 6);
        }
        if (analyserRemRef.current) {
          analyserRemRef.current.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          remoteLevelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 8);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (e) {
      console.warn('[Phone] Level meter setup failed:', e.message);
    }
  }

  function teardownLevelMeters() {
    analyserMicRef.current = null;
    analyserRemRef.current = null;
    micLevelRef.current = 0;
    remoteLevelRef.current = 0;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
  }

  // ── Reset call state ─────────────────────────────────────────────────────────

  const resetCallState = useCallback(() => {
    stopTimer();
    teardownLevelMeters();
    callRef.current = null;
    setElapsed(0);
    setIsMuted(false);
    setIsOnHold(false);
    setActiveName('');
    setActiveNumber('');
    setInboundCall(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle call state updates from SDK ───────────────────────────────────────

  const handleCallUpdate = useCallback((call) => {
    const state = call.state;
    const dir   = call.direction; // 'inbound' or 'outbound'

    console.log('[Phone] Call state:', state, 'dir:', dir);

    if (state === 'ringing' && dir === 'inbound') {
      callRef.current = call;
      const from = call.options?.remoteCallerNumber || call.options?.callerNumber || 'Unknown';
      const name = call.options?.remoteCallerName || from;
      callMetaRef.current = { direction: 'inbound', from, to: '+15878643090', name, startedAt: new Date().toISOString() };
      setInboundCall({ name, number: from });
      setStatus('ringing');
      startRingtone({ ringOnCall: true, ringtone: 'classic', ringVolume: 80, vibrateOnCall: true });
      if (Notification?.permission === 'granted') {
        new Notification('Incoming Call', { body: name, icon: '/favicon.ico', tag: 'incoming-call', renotify: false });
      }
      return;
    }

    if ((state === 'trying' || state === 'requesting' || (state === 'ringing' && dir === 'outbound'))) {
      callRef.current = call;
      setStatus('calling');
      return;
    }

    if (state === 'active') {
      stopRingtone();
      setInboundCall(null);
      setStatus('active');
      startTimer();
      // Wire up level meters to the call's audio streams
      // Give the SDK a moment to attach streams
      setTimeout(() => {
        if (callRef.current) {
          setupLevelMeters(callRef.current.remoteStream, callRef.current.localStream);
        }
      }, 500);
      return;
    }

    if (state === 'held') {
      setStatus('held');
      setIsOnHold(true);
      return;
    }

    if (state === 'active' && isOnHold) {
      setStatus('active');
      setIsOnHold(false);
      return;
    }

    if (state === 'hangup' || state === 'destroy' || state === 'purge') {
      stopRingtone();
      // Log the completed call
      const meta = callMetaRef.current;
      if (meta && meta.startedAt) {
        const endedAt = new Date().toISOString();
        const duration = Math.round((new Date(endedAt) - new Date(meta.startedAt)) / 1000);
        const wasAnswered = duration > 2; // if < 2s, it was missed/unanswered
        api.createCallLog({
          direction: meta.direction,
          from_number: meta.from,
          to_number: meta.to,
          from_name: meta.direction === 'inbound' ? meta.name : 'Me',
          to_name: meta.direction === 'outbound' ? meta.name : 'Me',
          status: wasAnswered ? 'ended' : (meta.direction === 'inbound' ? 'missed' : 'no-answer'),
          duration: wasAnswered ? duration : 0,
          started_at: meta.startedAt,
          ended_at: endedAt,
          transcript: meta._transcript || null,
        }).catch(() => {});
        callMetaRef.current = null;
      }
      setStatus('ready');
      resetCallState();
      return;
    }
  }, [isOnHold, resetCallState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect to Telnyx WebRTC ──────────────────────────────────────────────────

  const connectWebRTC = useCallback(async () => {
    if (!mountedRef.current) return;
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }

    setStatus('connecting');

    // Fetch login token from server
    let token;
    try {
      const base = getServerBase();
      const headers = { 'Content-Type': 'application/json' };
      const sessionToken = localStorage.getItem('con_session_token')
        || document.cookie.match(/session=([^;]+)/)?.[1];
      if (sessionToken) headers['x-session'] = sessionToken;
      const resp = await fetch(`${base}/api/phone/webrtc-token`, { headers, credentials: 'include' });
      if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`);
      const data = await resp.json();
      token = data.token;
    } catch (e) {
      console.error('[Phone] Failed to get WebRTC token:', e.message);
      if (mountedRef.current) {
        setLastError('Could not connect to phone service');
        setStatus('idle');
      }
      return;
    }

    const remoteEl = getOrCreateRemoteAudio();
    refreshDevices();

    const client = new TelnyxRTC({
      login_token: token,
      // Audio constraints
      audio: {
        deviceId: inputDeviceIdRef.current !== 'default' ? inputDeviceIdRef.current : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
      ringFile: '',  // suppress SDK default ringtone
    });

    client.remoteElement = remoteEl;

    client.on('telnyx.socket.open', () => {
      console.log('[Phone] Telnyx WebRTC connected');
    });

    client.on('telnyx.ready', () => {
      console.log('[Phone] Telnyx registered — ready');
      if (mountedRef.current) { setStatus('ready'); setLastError(null); }
    });

    client.on('telnyx.socket.close', () => {
      console.log('[Phone] Telnyx WebRTC disconnected');
      if (mountedRef.current) {
        setStatus('idle');
        resetCallState();
        // Reconnect after delay
        setTimeout(() => { if (mountedRef.current) connectWebRTC(); }, 5000);
      }
    });

    client.on('telnyx.socket.error', (err) => {
      console.error('[Phone] Telnyx WebRTC error:', err);
      if (mountedRef.current) setLastError('Connection error');
    });

    client.on('telnyx.error', (err) => {
      console.error('[Phone] Telnyx error:', err);
      if (mountedRef.current) {
        setLastError(err?.message || 'Phone registration failed');
        setStatus('idle');
      }
    });

    client.on('telnyx.notification', (notification) => {
      if (!mountedRef.current) return;
      if (notification.type === 'callUpdate') {
        handleCallUpdate(notification.call);
      }
    });

    clientRef.current = client;
    client.connect();
  }, [handleCallUpdate, resetCallState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      if (!Capacitor.isNativePlatform()) {
        const perm = await checkMicPermission();
        if (mountedRef.current) setMicStatus(perm);
        if (perm === 'denied') { setMicDenied(true); setStatus('idle'); return; }
      }
      if (Capacitor.isNativePlatform()) {
        const ok = await ensureMicPermission();
        if (!ok) { setMicDenied(true); setMicStatus('denied'); setStatus('idle'); return; }
        setMicStatus('granted');
      }
      connectWebRTC();
    })();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        const c = clientRef.current;
        if (!c || !c.connected) connectWebRTC();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    }

    return () => {
      mountedRef.current = false;
      stopTimer();
      teardownLevelMeters();
      document.removeEventListener('visibilitychange', onVisible);
      if (navigator.mediaDevices) navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      if (clientRef.current) {
        try { clientRef.current.disconnect(); } catch {}
        clientRef.current = null;
      }
      const el = document.getElementById('telnyx-remote-audio');
      if (el) { el.srcObject = null; el.remove(); }
    };
  }, [connectWebRTC]); // eslint-disable-line react-hooks/exhaustive-deps

  // FCM push wake
  useEffect(() => {
    const handler = () => {
      const c = clientRef.current;
      if (!c || !c.connected) connectWebRTC();
    };
    callEventEmitter.addEventListener('incoming_call', handler);
    return () => callEventEmitter.removeEventListener('incoming_call', handler);
  }, [connectWebRTC]);

  // ── Call controls ─────────────────────────────────────────────────────────────

  const makeCall = useCallback(async (number, name) => {
    const client = clientRef.current;
    if (!client) { setLastError('Not connected'); return; }

    if (!Capacitor.isNativePlatform()) {
      const perm = await checkMicPermission();
      if (perm === 'prompt') {
        const ok = await ensureMicPermission();
        if (ok) setMicStatus('granted'); else { setMicStatus('denied'); setMicDenied(true); return; }
      } else if (perm === 'denied') { setMicStatus('denied'); setMicDenied(true); return; }
    }

    let dest = number.replace(/\D/g, '');
    if (dest.length === 10) dest = '1' + dest;
    if (!dest.startsWith('+')) dest = '+' + dest;

    setActiveNumber(number);
    setActiveName(name || number);
    setStatus('calling');
    callMetaRef.current = { direction: 'outbound', from: '+15878643090', to: dest, name: name || number, startedAt: new Date().toISOString() };

    try {
      const call = client.newCall({
        destinationNumber: dest,
        callerNumber: '+15878643090',
        audio: true,
        video: false,
        remoteElement: getOrCreateRemoteAudio(),
      });
      callRef.current = call;
    } catch (e) {
      setLastError(e.message || 'Call failed');
      setStatus('ready');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const answerCall = useCallback(() => {
    stopRingtone();
    const call = callRef.current;
    if (!call) return;
    setActiveName(inboundCall?.name || '');
    setActiveNumber(inboundCall?.number || '');
    setInboundCall(null);
    call.answer({
      audio: true,
      video: false,
      remoteElement: getOrCreateRemoteAudio(),
    });
    // Apply saved output device after a short delay
    setTimeout(() => {
      const el = remoteAudioRef.current;
      if (el && outputDeviceId !== 'default' && typeof el.setSinkId === 'function') {
        el.setSinkId(outputDeviceId).catch(() => {});
      }
    }, 500);
  }, [inboundCall, outputDeviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hangup = useCallback((transcript) => {
    stopRingtone();
    // Attach transcript to meta so it gets logged on hangup
    if (transcript && callMetaRef.current) callMetaRef.current._transcript = transcript;
    const call = callRef.current;
    if (call) { try { call.hangup(); } catch {} }
    setStatus('ready');
    resetCallState();
  }, [resetCallState]);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (call) {
      if (isMutedRef.current) call.unmute({ audio: true });
      else call.mute({ audio: true });
    }
    setIsMuted(m => !m);
  }, []);

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
    if (call) call.dtmf(String(digit));
  }, []);

  const blindTransfer = useCallback(() => hangup(), [hangup]);

  // Recording not used in WebRTC mode (Call Control recording requires server-side)
  const startRecording  = useCallback(() => {}, []);
  const stopRecording   = useCallback(async () => null, []);
  const toggleRecording = useCallback(() => {}, []);
  const [isRecording]   = useState(false);
  const [callControlId] = useState(null);

  const fmtElapsed = () => {
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  return {
    status, activeName, activeNumber, elapsed, fmtElapsed,
    isMuted, isOnHold, inboundCall, phoneNumber, callControlId,
    micDenied, micStatus, isRecording,
    startRecording, stopRecording, toggleRecording,
    lastError,
    outputDevices, outputDeviceId, setOutputDevice,
    inputDevices, inputDeviceId, setInputDevice,
    micLevelRef, remoteLevelRef,
    makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer,
  };
}
