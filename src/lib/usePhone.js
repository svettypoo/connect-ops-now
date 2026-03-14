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
  const [phoneNumber, setPhoneNumber]      = useState('+15878643090');
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
  const recorderRef     = useRef(null);   // MediaRecorder for call recording
  const recChunksRef    = useRef([]);     // accumulated recording chunks
  const recAudioCtxRef  = useRef(null);   // AudioContext used for mixing recording
  const noiseCtxRef     = useRef(null);   // AudioContext for noise processing pipeline
  const cleanStreamRef  = useRef(null);   // processed mic MediaStream (noise-gated)
  const timerRef        = useRef(null);
  const startTimeRef    = useRef(null);
  const mountedRef      = useRef(true);
  const isMutedRef      = useRef(false);
  const inputDeviceIdRef = useRef('default');
  const isConnectingRef  = useRef(false);   // guard against concurrent connectWebRTC calls
  const statusRef        = useRef('idle');  // mirror of status for SSE callback
  const reconnectTimer   = useRef(null);    // pending reconnect setTimeout id
  const inboundCallRef   = useRef(null);    // separate ref for inbound call when already on a call
  const pendingCcidRef   = useRef(null);    // call_control_id from SSE-first inbound routing
  const activeCcidRef    = useRef(null);    // call_control_id of the active PSTN leg (for transfer)

  // Level refs (read by AudioLevels component via requestAnimationFrame)
  const micLevelRef    = useRef(0);
  const remoteLevelRef = useRef(0);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { statusRef.current = status; }, [status]);

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

  // ── Noise processing pipeline ─────────────────────────────────────────────────
  // Creates an AudioContext chain: mic → highpass (cut <85Hz rumble) → noise gate
  // (silence anything below speech threshold) → analyser → output stream.
  // The processed stream replaces the raw mic on the active call.

  function createNoiseProcessor(rawMicStream) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      noiseCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(rawMicStream);

      // 1) High-pass filter — cut rumble below 100 Hz (fans, AC, traffic, hum)
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 100;
      highpass.Q.value = 0.7;

      // 2) Low-pass filter — cut hiss above 7 kHz
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 7000;
      lowpass.Q.value = 0.5;

      // 3) Compressor — aggressive ratio to squash background noise
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -40;  // dB — only speech above this passes cleanly
      compressor.knee.value = 3;
      compressor.ratio.value = 20;       // very aggressive compression on quiet sounds
      compressor.attack.value = 0.002;   // 2ms — instant attack
      compressor.release.value = 0.15;   // 150ms — quick release for natural speech

      // 4) True noise gate — AnalyserNode monitors level, GainNode mutes when below threshold
      //    This clips low-volume audio entirely (silence, not just compression)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      const gateGain = ctx.createGain();
      gateGain.gain.value = 0; // start muted
      const gateThreshold = 0.015; // RMS threshold — below this = silence
      const gateOpen = 0.012;      // hysteresis — slightly lower to prevent chatter
      let gateIsOpen = false;
      const gateBuf = new Float32Array(analyser.fftSize);
      const gateCheck = () => {
        if (!noiseCtxRef.current || noiseCtxRef.current.state === 'closed') return;
        analyser.getFloatTimeDomainData(gateBuf);
        let sum = 0;
        for (let i = 0; i < gateBuf.length; i++) sum += gateBuf[i] * gateBuf[i];
        const rms = Math.sqrt(sum / gateBuf.length);
        if (!gateIsOpen && rms > gateThreshold) {
          gateIsOpen = true;
          gateGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.005); // open fast (5ms)
        } else if (gateIsOpen && rms < gateOpen) {
          gateIsOpen = false;
          gateGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05); // close slower (50ms)
        }
        requestAnimationFrame(gateCheck);
      };
      requestAnimationFrame(gateCheck);

      // 5) Make-up gain to compensate
      const makeupGain = ctx.createGain();
      makeupGain.gain.value = 1.4;

      // Chain: source → highpass → lowpass → compressor → analyser + gateGain → makeup → destination
      const dest = ctx.createMediaStreamDestination();
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(analyser);
      compressor.connect(gateGain);
      gateGain.connect(makeupGain);
      makeupGain.connect(dest);

      cleanStreamRef.current = dest.stream;
      console.log('[Phone] Noise processing pipeline active (highpass 100Hz, lowpass 7kHz, gate threshold 0.015, compressor -40dB/20:1)');
      return dest.stream;
    } catch (e) {
      console.warn('[Phone] Noise processing setup failed, using raw mic:', e.message);
      return rawMicStream; // fallback to raw
    }
  }

  function teardownNoiseProcessor() {
    if (noiseCtxRef.current && noiseCtxRef.current.state !== 'closed') {
      noiseCtxRef.current.close().catch(() => {});
    }
    noiseCtxRef.current = null;
    cleanStreamRef.current = null;
  }

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
    teardownNoiseProcessor();
    callRef.current = null;
    pendingCcidRef.current = null;
    activeCcidRef.current = null;
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

    console.log('[Phone] Call state:', state, 'dir:', dir, 'hasRemote:', !!call.remoteStream);

    if (state === 'ringing' && dir === 'inbound') {
      const from = call.options?.remoteCallerNumber || call.options?.callerNumber || 'Unknown';
      const name = call.options?.remoteCallerName || from;
      const alreadyOnCall = statusRef.current === 'active' || statusRef.current === 'held' || statusRef.current === 'calling';
      if (alreadyOnCall) {
        // Don't overwrite active call — store inbound separately
        inboundCallRef.current = call;
      } else {
        callRef.current = call;
        callMetaRef.current = { direction: 'inbound', from, to: '+15878643090', name, startedAt: new Date().toISOString() };
        setStatus('ringing');
      }
      setInboundCall({ name, number: from, call });
      startRingtone({ ringOnCall: true, ringtone: 'classic', ringVolume: 80, vibrateOnCall: true });
      if (Notification?.permission === 'granted') {
        new Notification('Incoming Call', { body: name, icon: '/favicon.ico', tag: 'incoming-call', renotify: false });
      }
      return;
    }

    if ((state === 'trying' || state === 'requesting' || state === 'early' || (state === 'ringing' && dir === 'outbound'))) {
      callRef.current = call;
      setStatus('calling');
      return;
    }

    if (state === 'active' || state === 'answering') {
      stopRingtone();
      setInboundCall(null);
      setStatus('active');
      setIsOnHold(false);
      if (!timerRef.current) startTimer();
      // Wire up noise processing, level meters + auto-start recording
      // Give the SDK a moment to attach streams
      setTimeout(() => {
        const call = callRef.current;
        if (call) {
          // Apply noise processing to outgoing mic audio
          if (call.localStream) {
            const cleanStream = createNoiseProcessor(call.localStream);
            // Replace mic track on the peer connection with the processed one
            try {
              const pc = call.peer?.instance; // RTCPeerConnection
              if (pc) {
                const cleanTrack = cleanStream.getAudioTracks()[0];
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender && cleanTrack) {
                  sender.replaceTrack(cleanTrack);
                  console.log('[Phone] Replaced mic track with noise-processed stream');
                }
              }
            } catch (e) {
              console.warn('[Phone] Could not replace mic track:', e.message);
            }
          }
          setupLevelMeters(call.remoteStream, call.localStream);
          startRecording(call.remoteStream, call.localStream);
        }
      }, 500);
      return;
    }

    if (state === 'held') {
      setStatus('held');
      setIsOnHold(true);
      return;
    }

    if (state === 'hangup' || state === 'destroy' || state === 'purge') {
      stopRingtone();
      // Stop recording — upload happens async in background
      const endedAt = new Date().toISOString();
      if (callMetaRef.current) {
        const dur = Math.round((new Date(endedAt) - new Date(callMetaRef.current.startedAt)) / 1000);
        callMetaRef.current.duration = dur;
      }
      stopRecording(); // fire-and-forget upload
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
    if (isConnectingRef.current) return; // already in progress
    isConnectingRef.current = true;
    clearTimeout(reconnectTimer.current);

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
      if (data.phone_number) setPhoneNumber(data.phone_number);
    } catch (e) {
      console.error('[Phone] Failed to get WebRTC token:', e.message);
      isConnectingRef.current = false;
      if (mountedRef.current) {
        setLastError('Could not connect to phone service');
        setStatus('idle');
        reconnectTimer.current = setTimeout(() => { if (mountedRef.current) connectWebRTC(); }, 8000);
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
      isConnectingRef.current = false;
      if (mountedRef.current) { setStatus('ready'); setLastError(null); }
    });

    client.on('telnyx.socket.close', () => {
      console.log('[Phone] Telnyx WebRTC disconnected');
      isConnectingRef.current = false;
      if (mountedRef.current) {
        setStatus('idle');
        resetCallState();
        // Reconnect after delay — guarded by isConnectingRef so only one pending timer
        reconnectTimer.current = setTimeout(() => { if (mountedRef.current) connectWebRTC(); }, 5000);
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
      console.log('[Phone] Telnyx notification:', notification.type, notification.call?.state);
      if (!mountedRef.current) return;
      if (notification.type === 'callUpdate') {
        handleCallUpdate(notification.call);
      }
    });

    clientRef.current = client;
    window.__telnyxClient = client; // Expose for Dream testing
    // Expose test helper to simulate inbound calls (for Dream QA testing)
    window.__simulateInbound = (name, number) => {
      handleCallUpdate({
        state: 'ringing',
        direction: 'inbound',
        options: { remoteCallerName: name || 'Test Caller', remoteCallerNumber: number || '+10001112222', callerName: name || 'Test Caller', callerNumber: number || '+10001112222' },
        answer() { handleCallUpdate({ ...this, state: 'active' }); },
        hangup() { resetCallState(); },
      });
    };
    client.connect();
  }, [handleCallUpdate, resetCallState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Fetch phone number on mount regardless of mic permissions
    (async () => {
      try {
        const base = getServerBase();
        const headers = { 'Content-Type': 'application/json' };
        const sessionToken = localStorage.getItem('con_session_token')
          || document.cookie.match(/session=([^;]+)/)?.[1];
        if (sessionToken) headers['x-session'] = sessionToken;
        const resp = await fetch(`${base}/api/phone/webrtc-token`, { headers, credentials: 'include' });
        if (resp.ok) {
          const data = await resp.json();
          if (data.phone_number && mountedRef.current) setPhoneNumber(data.phone_number);
        }
      } catch {}
    })();

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

    // SSE: listen for server-side call events (call.answered, call.hangup)
    const sessionToken = localStorage.getItem('con_session_token')
      || document.cookie.match(/session=([^;]+)/)?.[1] || '';
    const sseUrl = `${getServerBase()}/api/phone/call-events?session=${encodeURIComponent(sessionToken)}`;
    let sse = null;
    try {
      sse = new EventSource(sseUrl);
      sse.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          console.log('[Phone] SSE event:', evt.type);
          // Server-side incoming call notification (SSE-first routing)
          if (evt.type === 'call.incoming' && statusRef.current !== 'active' && statusRef.current !== 'calling') {
            console.log('[Phone] SSE: incoming call from', evt.from, evt.callerName);
            pendingCcidRef.current = evt.callControlId;
            callMetaRef.current = { direction: 'inbound', from: evt.from, to: evt.to, name: evt.callerName, startedAt: new Date().toISOString() };
            setInboundCall({ name: evt.callerName, number: evt.from });
            setStatus('ringing');
            startRingtone({ ringOnCall: true, ringtone: 'classic', ringVolume: 80, vibrateOnCall: true });
            if (Notification?.permission === 'granted') {
              new Notification('Incoming Call', { body: evt.callerName, icon: '/favicon.ico', tag: 'incoming-call', renotify: false });
            }
          }
          if (evt.type === 'call.missed') {
            console.log('[Phone] SSE: call missed from', evt.from);
            if (statusRef.current === 'ringing') {
              stopRingtone();
              setInboundCall(null);
              setStatus('ready');
              pendingCcidRef.current = null;
            }
          }
          if (evt.type === 'call.answered' && statusRef.current === 'calling') {
            // Server confirmed the remote phone answered — transition to active
            const call = callRef.current;
            if (call) {
              stopRingtone();
              setInboundCall(null);
              setStatus('active');
              setIsOnHold(false);
              if (!timerRef.current) startTimer();
              setTimeout(() => {
                const c = callRef.current;
                if (c) {
                  if (c.localStream) {
                    const cleanStream = createNoiseProcessor(c.localStream);
                    try {
                      const pc = c.peer?.instance;
                      if (pc) {
                        const cleanTrack = cleanStream.getAudioTracks()[0];
                        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                        if (sender && cleanTrack) sender.replaceTrack(cleanTrack);
                      }
                    } catch (err) { console.warn('[Phone] SSE: mic track replace error:', err.message); }
                  }
                  setupLevelMeters(c.remoteStream, c.localStream);
                  startRecording(c.remoteStream, c.localStream);
                }
              }, 500);
            }
          }
        } catch {}
      };
      sse.onerror = () => { /* SSE will auto-reconnect */ };
    } catch {}

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
      isConnectingRef.current = false;
      clearTimeout(reconnectTimer.current);
      stopTimer();
      teardownLevelMeters();
      if (recorderRef.current) { try { recorderRef.current.stop(); } catch {} recorderRef.current = null; }
      try { recAudioCtxRef.current?.close(); } catch {} recAudioCtxRef.current = null;
      if (sse) { try { sse.close(); } catch {} }
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

  const answerCall = useCallback(async () => {
    stopRingtone();

    // SSE-first routing: if we have a pending call_control_id from the server,
    // tell the server to answer + transfer to SIP credential (which will arrive as SDK inbound)
    if (pendingCcidRef.current) {
      const ccid = pendingCcidRef.current;
      pendingCcidRef.current = null;
      activeCcidRef.current = ccid; // store for transfer
      setActiveName(inboundCall?.name || '');
      setActiveNumber(inboundCall?.number || '');
      setInboundCall(null);
      setStatus('calling'); // show "connecting" while server answers + transfers
      try {
        const base = getServerBase();
        const headers = { 'Content-Type': 'application/json' };
        const sessionToken = localStorage.getItem('con_session_token')
          || document.cookie.match(/session=([^;]+)/)?.[1];
        if (sessionToken) headers['x-session'] = sessionToken;
        await fetch(`${base}/api/phone/answer-call`, {
          method: 'POST', headers, credentials: 'include',
          body: JSON.stringify({ callControlId: ccid }),
        });
        // The server will answer the PSTN call and transfer to our SIP credential.
        // The SDK will receive an inbound call notification shortly — handleCallUpdate takes over.
      } catch (e) {
        console.error('[Phone] answer-call failed:', e.message);
        setLastError('Failed to answer call');
        setStatus('ready');
      }
      return;
    }

    // Standard SDK inbound call (direct SIP)
    const inbCall = inboundCallRef.current || callRef.current;
    if (!inbCall) return;
    if (inboundCallRef.current && callRef.current && callRef.current !== inboundCallRef.current) {
      try { callRef.current.hangup(); } catch {}
    }
    callRef.current = inbCall;
    inboundCallRef.current = null;
    setActiveName(inboundCall?.name || '');
    setActiveNumber(inboundCall?.number || '');
    setInboundCall(null);
    inbCall.answer({
      audio: true,
      video: false,
      remoteElement: getOrCreateRemoteAudio(),
    });
    setTimeout(() => {
      const el = remoteAudioRef.current;
      if (el && outputDeviceId !== 'default' && typeof el.setSinkId === 'function') {
        el.setSinkId(outputDeviceId).catch(() => {});
      }
    }, 500);
  }, [inboundCall, outputDeviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hangup = useCallback((transcript) => {
    stopRingtone();
    if (transcript && callMetaRef.current) callMetaRef.current._transcript = transcript;

    // If this was an SSE-routed inbound call that hasn't been answered yet, reject via server
    if (pendingCcidRef.current) {
      const ccid = pendingCcidRef.current;
      pendingCcidRef.current = null;
      const base = getServerBase();
      const headers = { 'Content-Type': 'application/json' };
      const sessionToken = localStorage.getItem('con_session_token')
        || document.cookie.match(/session=([^;]+)/)?.[1];
      if (sessionToken) headers['x-session'] = sessionToken;
      fetch(`${base}/api/phone/reject-call`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ callControlId: ccid }),
      }).catch(() => {});
    }

    const call = callRef.current;
    if (call) { try { call.hangup(); } catch {} }
    else {
      stopRecording();
    }
    setStatus('ready');
    resetCallState();
  }, [resetCallState]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const blindTransfer = useCallback(async (destination) => {
    if (!destination) return;
    // SSE-routed call: transfer via server API using stored call_control_id
    if (activeCcidRef.current) {
      try {
        const base = getServerBase();
        const headers = { 'Content-Type': 'application/json' };
        const sessionToken = localStorage.getItem('con_session_token')
          || document.cookie.match(/session=([^;]+)/)?.[1];
        if (sessionToken) headers['x-session'] = sessionToken;
        await fetch(`${base}/api/phone/transfer-call`, {
          method: 'POST', headers, credentials: 'include',
          body: JSON.stringify({ callControlId: activeCcidRef.current, destination }),
        });
      } catch (e) {
        console.error('[Phone] blind transfer failed:', e.message);
        setLastError('Transfer failed');
        return;
      }
    }
    // Disconnect our WebRTC leg — the PSTN call continues to the transfer destination
    const call = callRef.current;
    if (call) { try { call.hangup(); } catch {} }
    setStatus('ready');
    resetCallState();
  }, [resetCallState]);

  const [isRecording, setIsRecording] = useState(false);
  const [callControlId] = useState(null);

  // ── Browser-side call recording ──────────────────────────────────────────────

  const startRecording = useCallback((remoteStream, localStream) => {
    if (recorderRef.current) return; // already recording
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      recAudioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      if (remoteStream) ctx.createMediaStreamSource(remoteStream).connect(dest);
      if (localStream)  ctx.createMediaStreamSource(localStream).connect(dest);

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(dest.stream, mimeType ? { mimeType } : {});
      recChunksRef.current = [];
      rec.ondataavailable = e => { if (e.data?.size > 0) recChunksRef.current.push(e.data); };
      rec.start(1000);
      recorderRef.current = rec;
      setIsRecording(true);
      console.log('[Phone] Recording started, mimeType:', mimeType || 'default');
    } catch (e) {
      console.warn('[Phone] Recording start failed:', e.message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return Promise.resolve(null);
    return new Promise(resolve => {
      rec.onstop = async () => {
        recorderRef.current = null;
        setIsRecording(false);
        try { recAudioCtxRef.current?.close(); } catch {} recAudioCtxRef.current = null;
        const chunks = recChunksRef.current;
        recChunksRef.current = [];
        if (!chunks.length) { resolve(null); return; }
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        const meta = callMetaRef.current || {};
        try {
          const form = new FormData();
          form.append('recording', blob, 'call.webm');
          form.append('from_number', meta.from || '+15878643090');
          form.append('to_number', meta.to || '');
          form.append('duration', String(meta.duration || 0));
          const sessionToken = localStorage.getItem('con_session_token');
          const headers = {};
          if (sessionToken) headers['x-session'] = sessionToken;
          const base = Capacitor.isNativePlatform() ? 'https://phone.stproperties.com' : '';
          const r = await fetch(`${base}/api/phone/upload-recording`, {
            method: 'POST', credentials: 'include', headers, body: form,
          });
          const data = await r.json();
          console.log('[Phone] Recording uploaded, id:', data.recording_id);
          resolve(data.recording_id || null);
        } catch (e) {
          console.warn('[Phone] Recording upload failed:', e.message);
          resolve(null);
        }
      };
      rec.stop();
    });
  }, []);

  const toggleRecording = useCallback(() => {
    if (recorderRef.current) {
      stopRecording();
    } else {
      const call = callRef.current;
      if (call) startRecording(call.remoteStream, call.localStream);
    }
  }, [startRecording, stopRecording]);

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
