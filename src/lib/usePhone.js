import { useState, useRef, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { startRingtone, stopRingtone } from "@/lib/useNotificationSettings";
import { callEventEmitter } from "@/lib/pushNotifications";

// ─── G.711 μ-law codec (8 kHz telephone audio) ───────────────────────────────

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
    const expV = s > 0 ? Math.max(0, Math.min(7, 31 - Math.clz32(s) - 6)) : 0;
    const mant = (s >> (expV + 2)) & 0x0f;
    out[i] = (~(sign | (expV << 4) | mant)) & 0xff;
  }
  return out;
}

// Downsample Float32 array from srcRate to 8000 using simple averaging
function downsampleTo8k(float32, srcRate) {
  if (srcRate === 8000) return float32;
  const ratio = srcRate / 8000;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end   = Math.floor((i + 1) * ratio);
    let sum = 0;
    for (let j = start; j < end && j < float32.length; j++) sum += float32[j];
    out[i] = sum / (end - start);
  }
  return out;
}

// ─── WebSocket URL helper ─────────────────────────────────────────────────────

function getWsBase() {
  if (Capacitor.isNativePlatform()) return 'wss://phone.stproperties.com';
  const loc = window.location;
  return (loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host;
}

function getSessionToken() {
  return localStorage.getItem('con_session_token')
    || document.cookie.match(/session=([^;]+)/)?.[1]
    || null;
}

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

// ─── usePhone hook ────────────────────────────────────────────────────────────

export function usePhone() {
  const [status,        setStatus]        = useState('idle');
  const [activeName,    setActiveName]    = useState('');
  const [activeNumber,  setActiveNumber]  = useState('');
  const [elapsed,       setElapsed]       = useState(0);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isOnHold,      setIsOnHold]      = useState(false);
  const [inboundCall,   setInboundCall]   = useState(null);
  const [phoneNumber,   setPhoneNumber]   = useState('+15878643090');
  const [callControlId, setCallControlId] = useState(null);
  const [micDenied,     setMicDenied]     = useState(false);
  const [micStatus,     setMicStatus]     = useState('prompt');
  const [isRecording,   setIsRecording]   = useState(false);
  const [lastError,     setLastError]     = useState(null);
  const [outputDevices, setOutputDevices] = useState([]); // [{deviceId, label}]
  const [outputDeviceId,setOutputDeviceId] = useState('default');

  const wsRef       = useRef(null);
  const audioCtxRef = useRef(null);  // AudioContext for playback
  const audioDestRef= useRef(null);  // MediaStreamDestinationNode
  const audioElRef  = useRef(null);  // HTMLAudioElement (for setSinkId)
  const nextPlayRef = useRef(0);
  const micCtxRef   = useRef(null);
  const micStreamRef= useRef(null);
  const micProcRef  = useRef(null);
  const isMutedRef  = useRef(false);
  const timerRef    = useRef(null);
  const startTimeRef= useRef(null);
  const mountedRef  = useRef(true);

  // Keep isMutedRef in sync (used inside ScriptProcessor callback)
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() =>
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);

  // ── Audio playback setup ─────────────────────────────────────────────────────
  // MUST be called during a user-gesture so AudioContext starts in running state.

  function setupAudioCtx() {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.resume().catch(() => {});
      return;
    }
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ctx.createMediaStreamDestination();
    audioCtxRef.current  = ctx;
    audioDestRef.current = dest;
    nextPlayRef.current  = 0;

    // HTMLAudioElement lets us call setSinkId for output device selection
    let el = document.getElementById('sb-playback-audio');
    if (!el) {
      el = document.createElement('audio');
      el.id = 'sb-playback-audio';
      el.autoplay = true;
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    el.srcObject = dest.stream;
    audioElRef.current = el;
    el.play().catch(() => {});
  }

  function playAudioChunk(base64Payload) {
    if (!base64Payload || !audioCtxRef.current || !audioDestRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try {
      const raw   = atob(base64Payload);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const pcm    = decodeMulaw(bytes);
      const buffer = ctx.createBuffer(1, pcm.length, 8000);
      buffer.copyToChannel(pcm, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(audioDestRef.current); // → HTMLAudioElement (not ctx.destination to avoid double-output)
      const now = ctx.currentTime;
      if (nextPlayRef.current < now + 0.02) nextPlayRef.current = now + 0.08; // 80ms initial buffer
      src.start(nextPlayRef.current);
      nextPlayRef.current += buffer.duration;
    } catch (e) {
      console.warn('[Phone] playAudioChunk error:', e.message);
    }
  }

  // ── Output device selection ───────────────────────────────────────────────────

  async function refreshOutputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const outputs = all
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` }));
      if (mountedRef.current) setOutputDevices(outputs);
    } catch {}
  }

  const setOutputDevice = useCallback(async (deviceId) => {
    setOutputDeviceId(deviceId);
    const el = audioElRef.current;
    if (el && typeof el.setSinkId === 'function') {
      await el.setSinkId(deviceId).catch(() => {});
    }
  }, []);

  // ── Mic capture ───────────────────────────────────────────────────────────────

  async function startMicCapture() {
    if (micProcRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;

      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      micCtxRef.current = ctx;
      const src  = ctx.createMediaStreamSource(stream);
      // Buffer size = 256 samples → ~32ms at 8kHz equivalent after downsampling
      const proc = ctx.createScriptProcessor(512, 1, 1);

      // Silent gain node — keeps ScriptProcessor alive without routing mic to speakers
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      proc.connect(silentGain);
      silentGain.connect(ctx.destination);
      src.connect(proc);

      proc.onaudioprocess = e => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (isMutedRef.current) return;
        const float32     = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo8k(float32, ctx.sampleRate);
        const mulaw       = encodeMulaw(downsampled);
        const base64      = btoa(String.fromCharCode(...mulaw));
        wsRef.current.send(JSON.stringify({ type: 'audio', payload: base64 }));
      };

      micProcRef.current = proc;
      console.log('[Phone] Mic capture started at', ctx.sampleRate, 'Hz');
    } catch (e) {
      console.error('[Phone] Mic capture failed:', e.message);
    }
  }

  function stopMicCapture() {
    if (micProcRef.current) { try { micProcRef.current.disconnect(); } catch {} micProcRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (micCtxRef.current) { try { micCtxRef.current.close(); } catch {} micCtxRef.current = null; }
  }

  // ── Reset call state ─────────────────────────────────────────────────────────

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

  // ── WebSocket connection ──────────────────────────────────────────────────────

  const connectWs = useCallback(() => {
    if (!mountedRef.current) return;

    const token = getSessionToken();
    const url   = `${getWsBase()}/ws/phone${token ? '?session=' + encodeURIComponent(token) : ''}`;
    console.log('[Phone] Connecting switchboard WS');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[Phone] Switchboard WS connected');
      setStatus('ready');
      setLastError(null);
      refreshOutputDevices();
    };

    ws.onclose = e => {
      if (!mountedRef.current) return;
      console.log('[Phone] Switchboard WS closed:', e.code);
      setStatus('idle');
      resetCallState();
      if (e.code !== 4999) setTimeout(() => { if (mountedRef.current) connectWs(); }, 3000);
    };

    ws.onerror = () => console.error('[Phone] Switchboard WS error');

    ws.onmessage = async e => {
      if (!mountedRef.current) return;
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === 'audio') {
        // Only play inbound track (what remote party says)
        if (!msg.track || msg.track === 'inbound') playAudioChunk(msg.payload);
        return;
      }

      if (msg.type === 'calling') {
        setStatus('calling');
        if (msg.callControlId) setCallControlId(msg.callControlId);
        return;
      }

      if (msg.type === 'ringing') {
        setInboundCall({ name: msg.name || msg.from, number: msg.from });
        setCallControlId(msg.callControlId || null);
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
        // AudioContext was set up during makeCall/answerCall (user gesture) — just resume
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
        await startMicCapture();
        // Apply stored output device
        if (outputDeviceId !== 'default' && audioElRef.current && typeof audioElRef.current.setSinkId === 'function') {
          audioElRef.current.setSinkId(outputDeviceId).catch(() => {});
        }
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
      setStatus('connecting');
      connectWs();
    })();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        const ws = wsRef.current;
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) connectWs();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshOutputDevices);
    }

    return () => {
      mountedRef.current = false;
      stopTimer();
      stopMicCapture();
      document.removeEventListener('visibilitychange', onVisible);
      if (navigator.mediaDevices) navigator.mediaDevices.removeEventListener('devicechange', refreshOutputDevices);
      if (wsRef.current) wsRef.current.close(4999, 'unmount');
      // Clean up audio element
      const el = document.getElementById('sb-playback-audio');
      if (el) { el.srcObject = null; }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    };
  }, [connectWs]); // eslint-disable-line react-hooks/exhaustive-deps

  // FCM push wake
  useEffect(() => {
    const handler = () => {
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) connectWs();
    };
    callEventEmitter.addEventListener('incoming_call', handler);
    return () => callEventEmitter.removeEventListener('incoming_call', handler);
  }, [connectWs]);

  // ── Call controls ─────────────────────────────────────────────────────────────

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

    // Set up AudioContext NOW — during user gesture — so it starts in 'running' state
    setupAudioCtx();

    let dest = number.replace(/\D/g, '');
    if (dest.length === 10) dest = '1' + dest;
    if (!dest.startsWith('+')) dest = '+' + dest;

    setActiveNumber(number);
    setActiveName(name || number);
    setStatus('calling');
    ws.send(JSON.stringify({ type: 'call', to: dest, name: name || number }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const answerCall = useCallback(() => {
    stopRingtone();
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // Set up AudioContext during user gesture (user tapped Answer)
    setupAudioCtx();
    setActiveName(inboundCall?.name || '');
    setActiveNumber(inboundCall?.number || '');
    setInboundCall(null);
    ws.send(JSON.stringify({ type: 'answer' }));
  }, [inboundCall]); // eslint-disable-line react-hooks/exhaustive-deps

  const hangup = useCallback(() => {
    stopRingtone();
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hangup' }));
    setStatus('ready');
    resetCallState();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(() => setIsMuted(m => !m), []);

  const toggleHold = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isOnHold) {
      ws.send(JSON.stringify({ type: 'unhold' }));
      setIsOnHold(false); setStatus('active');
    } else {
      ws.send(JSON.stringify({ type: 'hold' }));
      setIsOnHold(true); setStatus('held');
    }
  }, [isOnHold]);

  const sendDtmf = useCallback((digit) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'dtmf', digit }));
  }, []);

  const blindTransfer = useCallback(() => hangup(), [hangup]);

  // Recording not available in switchboard mode
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
    outputDevices, outputDeviceId, setOutputDevice,
    makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer,
  };
}
