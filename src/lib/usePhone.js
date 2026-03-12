import { useState, useRef, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { UserAgent, Registerer, RegistererState, Inviter, SessionState } from "sip.js";
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
  const [status, setStatus]         = useState("idle");
  const [activeName, setActiveName] = useState("");
  const [activeNumber, setActiveNumber] = useState("");
  const [elapsed, setElapsed]       = useState(0);
  const [isMuted, setIsMuted]       = useState(false);
  const [isOnHold, setIsOnHold]     = useState(false);
  const [inboundCall, setInboundCall] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [callControlId, setCallControlId] = useState(null);
  const [micDenied, setMicDenied]   = useState(false);
  const [micStatus, setMicStatus]   = useState('prompt');

  const [isRecording, setIsRecording] = useState(false);

  const uaRef         = useRef(null);
  const registererRef = useRef(null);
  const sessionRef    = useRef(null);
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(null);
  const mountedRef    = useRef(true);
  const remoteAudioRef = useRef(null);
  const sipConfigRef  = useRef(null);
  const recorderRef   = useRef(null);   // MediaRecorder
  const recChunksRef  = useRef([]);     // recorded chunks
  const recContextRef = useRef(null);   // AudioContext for mixing

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

  const attachRemoteAudio = (session) => {
    const audioEl = ensureAudioElement();
    const pc = session.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;
    const receivers = pc.getReceivers();
    if (receivers.length > 0) {
      const remoteStream = new MediaStream();
      receivers.forEach(r => { if (r.track) remoteStream.addTrack(r.track); });
      audioEl.srcObject = remoteStream;
      audioEl.play().catch(() => {});
      console.log('[Phone] Remote audio attached');
    }
  };

  const setupSessionRef = useRef(null);
  setupSessionRef.current = (session) => {
    session.stateChange.addListener((state) => {
      if (!mountedRef.current) return;
      switch (state) {
        case SessionState.Establishing:
          break;
        case SessionState.Established:
          stopRingtone();
          setInboundCall(null);
          setStatus("active");
          startTimer();
          attachRemoteAudio(session);
          break;
        case SessionState.Terminating:
        case SessionState.Terminated:
          stopRingtone();
          // Stop recording if active
          if (recorderRef.current) {
            try { recorderRef.current.stop(); } catch {}
            recorderRef.current = null;
            setIsRecording(false);
          }
          sessionRef.current = null;
          setInboundCall(null);
          setCallControlId(null);
          setStatus("ready");
          stopTimer();
          setElapsed(0);
          setIsMuted(false);
          setIsOnHold(false);
          setActiveName("");
          setActiveNumber("");
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
          break;
      }
    });
  };

  // ── Core init ──────────────────────────────────────────────────────────────
  const initSip = useCallback(async (config) => {
    if (!mountedRef.current) return;

    // Tear down previous UA
    if (uaRef.current) {
      try { await uaRef.current.stop(); } catch {}
      uaRef.current = null;
      registererRef.current = null;
    }

    ensureAudioElement();

    const uri = UserAgent.makeURI(`sip:${config.sip_user}@${config.sip_domain}`);
    if (!uri) {
      console.error('[Phone] Invalid SIP URI');
      setStatus('idle');
      return;
    }

    const ua = new UserAgent({
      uri,
      transportOptions: {
        server: config.wss_server,
        traceSip: false,
      },
      authorizationUsername: config.sip_user,
      authorizationPassword: config.sip_password,
      displayName: config.sip_user,
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [
            { urls: 'stun:stun.telnyx.com:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:turn.telnyx.com:3478',
              username: 'telnyx',
              credential: 'telnyx',
            },
            {
              urls: 'turns:turn.telnyx.com:5349',
              username: 'telnyx',
              credential: 'telnyx',
            },
          ],
        },
      },
      delegate: {
        onInvite: (invitation) => {
          if (!mountedRef.current) return;
          sessionRef.current = invitation;
          const from = invitation.remoteIdentity?.uri?.user || 'Unknown';
          const displayName = invitation.remoteIdentity?.displayName || from;
          setInboundCall({ name: displayName, number: from });
          setCallControlId(invitation.id || null);
          setStatus("ringing");
          startRingtone({ ringOnCall: true, ringtone: "classic", ringVolume: 80, vibrateOnCall: true, ...getNotifSettings() });
          if (Notification?.permission === "granted") {
            new Notification("Incoming Call", { body: displayName, icon: "/favicon.ico", tag: "incoming-call", renotify: false });
          }
          setupSessionRef.current(invitation);
        },
      },
    });
    uaRef.current = ua;

    ua.transport.onDisconnect = (error) => {
      if (!mountedRef.current) return;
      if (error) {
        console.warn('[Phone] Transport disconnected:', error.message);
        setStatus("reconnecting");
        setTimeout(() => {
          if (mountedRef.current && sipConfigRef.current) initSip(sipConfigRef.current);
        }, 3000);
      }
    };

    try {
      await ua.start();
    } catch (e) {
      console.error('[Phone] UA start failed:', e.message);
      setStatus('idle');
      return;
    }

    const registerer = new Registerer(ua, { expires: 3600 });
    registererRef.current = registerer;

    registerer.stateChange.addListener((state) => {
      if (!mountedRef.current) return;
      if (state === RegistererState.Registered) {
        console.log('[Phone] SIP registered');
        setStatus("ready");
      } else if (state === RegistererState.Unregistered) {
        console.log('[Phone] SIP unregistered');
        if (!sessionRef.current) setStatus("idle");
      }
    });

    try {
      await registerer.register();
    } catch (e) {
      console.warn('[Phone] Registration failed:', e.message);
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
            setStatus("idle");
            return;
          }
        }

        const config = await api.getSipConfig();
        if (!config?.sip_user || !mountedRef.current) return;
        sipConfigRef.current = config;
        setPhoneNumber(config.phone_number);
        setStatus("connecting");
        await initSip(config);
      } catch (e) {
        console.warn("SIP init:", e.message);
        if (mountedRef.current) setStatus("idle");
      }
    })();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current && sipConfigRef.current) {
        const connected = uaRef.current?.transport?.isConnected?.();
        if (!connected) {
          console.log('[Phone] visibility visible — reconnecting SIP');
          setStatus('connecting');
          initSip(sipConfigRef.current).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleDeviceChange = async () => {
      if (!remoteAudioRef.current || !sessionRef.current) return;
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
      try {
        registererRef.current?.unregister();
        uaRef.current?.stop();
      } catch {}
    };
  }, [initSip]);

  // ── FCM wake ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = async () => {
      if (!mountedRef.current || !sipConfigRef.current) return;
      const connected = uaRef.current?.transport?.isConnected?.();
      if (!connected) {
        console.log('[Phone] FCM wake — reconnecting SIP');
        setStatus('connecting');
        await initSip(sipConfigRef.current);
      }
    };
    callEventEmitter.addEventListener('incoming_call', handler);
    return () => callEventEmitter.removeEventListener('incoming_call', handler);
  }, [initSip]);

  const makeCall = useCallback(async (number, name) => {
    if (!uaRef.current) return;

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

    // Normalise to E.164
    let dest = number.replace(/\D/g, '');
    if (dest.length === 10) dest = '1' + dest;
    if (!dest.startsWith('+')) dest = '+' + dest;

    const targetURI = UserAgent.makeURI(`sip:${dest}@${sipConfigRef.current.sip_domain}`);
    if (!targetURI) { console.error('[Phone] Invalid target URI'); return; }

    const inviter = new Inviter(uaRef.current, targetURI, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    sessionRef.current = inviter;
    setCallControlId(inviter.id || null);
    setActiveNumber(number);
    setActiveName(name || number);
    setStatus("calling");

    setupSessionRef.current(inviter);

    try {
      await inviter.invite();
    } catch (e) {
      console.error('[Phone] Invite failed:', e.message);
      sessionRef.current = null;
      setStatus("ready");
    }
  }, [phoneNumber]);

  const answerCall = useCallback(() => {
    stopRingtone();
    if (!sessionRef.current) return;
    sessionRef.current.accept({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });
    setActiveName(inboundCall?.name || "");
    setActiveNumber(inboundCall?.number || "");
    setInboundCall(null);
  }, [inboundCall]);

  const hangup = useCallback(() => {
    stopRingtone();
    const session = sessionRef.current;
    if (session) {
      switch (session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (typeof session.cancel === 'function') session.cancel();
          else if (typeof session.reject === 'function') session.reject();
          break;
        case SessionState.Established:
          session.bye();
          break;
        default:
          if (typeof session.reject === 'function') session.reject();
          break;
      }
    }
    sessionRef.current = null;
    stopTimer();
    setStatus("ready");
    setElapsed(0);
    setIsMuted(false);
    setIsOnHold(false);
    setActiveName("");
    setActiveNumber("");
    setInboundCall(null);
    setCallControlId(null);
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const pc = session.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;
    pc.getSenders().forEach(s => {
      if (s.track && s.track.kind === 'audio') {
        s.track.enabled = isMuted; // if muted → enable, if unmuted → disable
      }
    });
    setIsMuted(m => !m);
  }, [isMuted]);

  const toggleHold = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.state !== SessionState.Established) return;

    if (isOnHold) {
      const options = {
        sessionDescriptionHandlerModifiers: [
          (description) => {
            description.sdp = description.sdp.replace(/a=inactive/g, 'a=sendrecv');
            return description;
          }
        ],
      };
      await session.invite(options).catch(() => {});
    } else {
      const options = {
        sessionDescriptionHandlerModifiers: [
          (description) => {
            description.sdp = description.sdp.replace(/a=sendrecv/g, 'a=inactive');
            return description;
          }
        ],
      };
      await session.invite(options).catch(() => {});
    }
    setIsOnHold(h => !h);
    setStatus(prev => prev === "held" ? "active" : "held");
  }, [isOnHold]);

  const sendDtmf = useCallback((digit) => {
    const session = sessionRef.current;
    if (!session) return;
    session.info({
      requestOptions: {
        body: {
          contentDisposition: 'render',
          contentType: 'application/dtmf-relay',
          content: `Signal=${digit}\r\nDuration=160`,
        },
      },
    }).catch(() => {});
  }, []);

  const blindTransfer = useCallback((dest) => {
    const session = sessionRef.current;
    if (!session) return;
    const targetURI = UserAgent.makeURI(`sip:${dest}@${sipConfigRef.current?.sip_domain || 'stproperties.com'}`);
    if (targetURI) {
      session.refer(targetURI).catch(() => {});
    }
    hangup();
  }, [hangup]);

  // ── Recording (client-side MediaRecorder) ──────────────────────────────────
  const startRecording = useCallback(() => {
    const session = sessionRef.current;
    if (!session || recorderRef.current) return;
    const pc = session.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;

    try {
      const ctx = new AudioContext();
      recContextRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();

      // Remote audio (from peer)
      const receivers = pc.getReceivers();
      if (receivers.length > 0) {
        const remoteStream = new MediaStream();
        receivers.forEach(r => { if (r.track) remoteStream.addTrack(r.track); });
        const remoteSrc = ctx.createMediaStreamSource(remoteStream);
        remoteSrc.connect(dest);
      }

      // Local audio (mic)
      const senders = pc.getSenders();
      const localTracks = senders.filter(s => s.track && s.track.kind === 'audio').map(s => s.track);
      if (localTracks.length > 0) {
        const localStream = new MediaStream(localTracks);
        const localSrc = ctx.createMediaStreamSource(localStream);
        localSrc.connect(dest);
      }

      recChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      recorder.start(1000); // 1s chunks
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
        if (blob.size < 1000) { resolve(null); return; } // too small = silence

        // Upload to server
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
