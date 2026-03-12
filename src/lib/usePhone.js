import { useState, useRef, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { startRingtone, stopRingtone } from "@/lib/useNotificationSettings";
import { callEventEmitter } from "@/lib/pushNotifications";

// ─── Switchboard audio codec: μ-law (G.711) 8 kHz ───────────────────────────
// Telnyx streams G.711 μ-law at 8 kHz; we decode/encode in the browser.

function decodeMulaw(bytes) {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const ulaw = (~bytes[i]) & 0xff;
    const sign = ulaw & 0x80 ? -1 : 1;
    const exp  = (ulaw >> 4) & 0x07;
    const mant = (ulaw & 0x0f) + 16;
    out[i] = sign * (mant << (exp + 2)) / 32768.0;
  }
  return out;
}

function encodeMulaw(float32) {
  const CLIP = 32635, BIAS = 0x84;
  const out = new Uint8Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.round(float32[i] * 32767);
    let sign = 0;
    if (s < 0) { sign = 0x80; s = -s; }
    if (s > CLIP) s = CLIP;
    s += BIAS;
    const exp  = 31 - Math.clz32(s) - 6;
    const expC = Math.max(0, Math.min(exp, 7));
    const mant = (s >> (expC + 2)) & 0x0f;
    out[i] = (~(sign | (expC << 4) | mant)) & 0xff;
  }
  return out;
}

// ─── WebSocket URL helper ────────────────────────────────────────────────────

function getWsBase() {
  if (Capacitor.isNativePlatform()) return 'wss://phone.stproperties.com';
  const loc = window.location;
  return (loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host;
}

function getSessionToken() {
  return localStorage.getItem('con_session_token');
}

// ─── Mic permission helpers ──────────────────────────────────────────────────

async function checkMicPermission() {
  try {
    const r = await navigator.permissions.query({ name: 'microphone' });
    return r.state;
  } catch { return 'prompt'; }
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => t.stop());
    return true;
  } catch { return false; }
}

// ─── usePhone hook ───────────────────────────────────────────────────────────

export function usePhone() {
  const [status,       setStatus]       = useState('idle');
  const [activeName,   setActiveName]   = useState('');
  const [activeNumber, setActiveNumber] = useState('');
  const [elapsed,      setElapsed]      = useState(0);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isOnHold,     setIsOnHold]     = useState(false);
  const [inboundCall,  setInboundCall]  = useState(null);
  const [phoneNumber,  setPhoneNumber]  = useState('+15878643090');
  const [callControlId,setCallControlId] = useState(null);
  const [micDenied,    setMicDenied]    = useState(false);
  const [micStatus,    setMicStatus]    = useState('prompt');
  const [isRecording,  setIsRecording]  = useState(false);
  const [lastError,    setLastError]    = useState(null);

  const wsRef         = useRef(null);   // WebSocket to server switchboard
  const audioCtxRef   = useRef(null);   // AudioContext for playback
  const nextPlayRef   = useRef(0);      // Scheduled playback time
  const micCtxRef     = useRef(null);   // Mic AudioContext
  const micStreamRef  = useRef(null);   // Mic MediaStream
  const micProcRef    = useRef(null);   // ScriptProcessor
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(null);
  const mountedRef    = useRef(true);
  const statusRef     = useRef('idle');

  // Keep statusRef in sync for use in callbacks
  useEffect(() => { statusRef.current = status; }, [status]);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);

  // ── Audio playback ──────────────────────────────────────────────────────────

  function ensureAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
      nextPlayRef.current = 0;
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
    return audioCtxRef.current;
  }

  function playAudioChunk(base64Payload) {
    if (!base64Payload) return;
    try {
      const ctx = ensureAudioCtx();
      const raw  = atob(base64Payload);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const pcm    = decodeMulaw(bytes);
      const buffer = ctx.createBuffer(1, pcm.length, 8000);
      buffer.copyToChannel(pcm, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      const now = ctx.currentTime;
      if (nextPlayRef.current < now + 0.02) nextPlayRef.current = now + 0.1;
      src.start(nextPlayRef.current);
      nextPlayRef.current += buffer.duration;
    } catch (e) {
      console.warn('[Phone] playAudioChunk error:', e.message);
    }
  }

  // ── Mic capture ─────────────────────────────────────────────────────────────

  async function startMicCapture() {
    if (micProcRef.current) return; // already running
    try {
      const constraints = { audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, sampleRate: 8000 } };
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia(constraints); }
      catch { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }

      micStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
      micCtxRef.current = ctx;
      const src  = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(320, 1, 1); // 40 ms at 8 kHz

      proc.onaudioprocess = e => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isMuted) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const mulaw   = encodeMulaw(float32);
        const base64  = btoa(String.fromCharCode(...mulaw));
        wsRef.current.send(JSON.stringify({ type: 'audio', payload: base64 }));
      };

      src.connect(proc);
      proc.connect(ctx.destination); // needed for ScriptProcessor to fire
      micProcRef.current = proc;
      console.log('[Phone] Mic capture started');
    } catch (e) {
      console.error('[Phone] Mic capture failed:', e.message);
    }
  }

  function stopMicCapture() {
    if (micProcRef.current) { try { micProcRef.current.disconnect(); } catch {} micProcRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (micCtxRef.current) { try { micCtxRef.current.close(); } catch {} micCtxRef.current = null; }
  }

  // ── Reset call state ────────────────────────────────────────────────────────

  const resetCallState = () => {
    stopTimer();
    stopMicCapture();
    setElapsed(0);
    setIsMuted(false);
    setIsOnHold(false);
    setActiveName('');
    setActiveNumber('');
    setInboundCall(null);
    setCallControlId(null);
    nextPlayRef.current = 0;
  };

  // ── WebSocket connection to switchboard ─────────────────────────────────────

  const connectWs = useCallback(() => {
    if (!mountedRef.current) return;

    const token = getSessionToken();
    const sessionCookie = document.cookie.match(/session=([^;]+)/)?.[1];
    const authToken = token || sessionCookie;

    const url = `${getWsBase()}/ws/phone${authToken ? '?session=' + encodeURIComponent(authToken) : ''}`;
    console.log('[Phone] Connecting switchboard WS:', url.replace(/session=[^&]+/, 'session=***'));

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[Phone] Switchboard WS connected');
      setStatus('ready');
      setLastError(null);
    };

    ws.onclose = e => {
      if (!mountedRef.current) return;
      console.log('[Phone] Switchboard WS closed:', e.code, e.reason);
      setStatus('idle');
      resetCallState();
      // Reconnect after 3 s unless we closed intentionally (4999)
      if (e.code !== 4999) {
        setTimeout(() => { if (mountedRef.current) connectWs(); }, 3000);
      }
    };

    ws.onerror = err => {
      console.error('[Phone] Switchboard WS error:', err);
    };

    ws.onmessage = async e => {
      if (!mountedRef.current) return;
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === 'audio') {
        // Only play inbound track (what the remote party says)
        if (!msg.track || msg.track === 'inbound') playAudioChunk(msg.payload);
        return;
      }

      if (msg.type === 'calling') {
        setStatus('calling');
        if (msg.callControlId) setCallControlId(msg.callControlId);
        return;
      }

      if (msg.type === 'ringing') {
        // Inbound call
        setInboundCall({ name: msg.name || msg.from, number: msg.from });
        setCallControlId(msg.callControlId);
        setStatus('ringing');
        startRingtone({ ringOnCall: true, ringtone: 'classic', ringVolume: 80, vibrateOnCall: true });
        if (Notification?.permission === 'granted') {
          new Notification('Incoming Call', { body: msg.name || msg.from, icon: '/favicon.ico', tag: 'incoming-call', renotify: false });
        }
        return;
      }

      if (msg.type === 'active') {
        stopRingtone();
        setInboundCall(null);
        setStatus('active');
        startTimer();
        await startMicCapture();
        return;
      }

      if (msg.type === 'hangup') {
        stopRingtone();
        setStatus('ready');
        resetCallState();
        return;
      }

      if (msg.type === 'error') {
        setLastError(msg.message || 'Switchboard error');
        setStatus('ready');
        resetCallState();
        return;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      // Check mic permission on web
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

      setStatus('connecting');
      connectWs();
    })();

    // Resume on visibility change
    const onVisible = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        const ws = wsRef.current;
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          connectWs();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      stopTimer();
      stopMicCapture();
      document.removeEventListener('visibilitychange', onVisible);
      if (wsRef.current) { wsRef.current.close(4999, 'unmount'); }
    };
  }, [connectWs]);

  // FCM push wake
  useEffect(() => {
    const handler = () => {
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        connectWs();
      }
    };
    callEventEmitter.addEventListener('incoming_call', handler);
    return () => callEventEmitter.removeEventListener('incoming_call', handler);
  }, [connectWs]);

  // ── Call controls ────────────────────────────────────────────────────────────

  const makeCall = useCallback(async (number, name) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) { setLastError('Not connected to switchboard'); return; }

    if (!Capacitor.isNativePlatform()) {
      const perm = await checkMicPermission();
      if (perm === 'prompt') {
        const ok = await ensureMicPermission();
        if (ok) setMicStatus('granted'); else { setMicStatus('denied'); setMicDenied(true); return; }
      } else if (perm === 'denied') { setMicStatus('denied'); setMicDenied(true); return; }
    }

    // Normalize to E.164
    let dest = number.replace(/\D/g, '');
    if (dest.length === 10) dest = '1' + dest;
    if (!dest.startsWith('+')) dest = '+' + dest;

    setActiveNumber(number);
    setActiveName(name || number);
    setStatus('calling');
    ws.send(JSON.stringify({ type: 'call', to: dest, name: name || number }));
  }, []);

  const answerCall = useCallback(() => {
    stopRingtone();
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    setActiveName(inboundCall?.name || '');
    setActiveNumber(inboundCall?.number || '');
    setInboundCall(null);
    ws.send(JSON.stringify({ type: 'answer' }));
  }, [inboundCall]);

  const hangup = useCallback(() => {
    stopRingtone();
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hangup' }));
    setStatus('ready');
    resetCallState();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m); // mic audio sending is gated by isMuted in onaudioprocess
  }, []);

  const toggleHold = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isOnHold) {
      ws.send(JSON.stringify({ type: 'unhold' }));
      setIsOnHold(false);
      setStatus('active');
    } else {
      ws.send(JSON.stringify({ type: 'hold' }));
      setIsOnHold(true);
      setStatus('held');
    }
  }, [isOnHold]);

  const sendDtmf = useCallback((digit) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'dtmf', digit }));
  }, []);

  const blindTransfer = useCallback(() => { hangup(); }, [hangup]);

  // Recording: not available in switchboard mode (no local WebRTC streams)
  const startRecording  = useCallback(() => {}, []);
  const stopRecording   = useCallback(async () => null, []);
  const toggleRecording = useCallback(() => {}, []);

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
    makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer,
  };
}
