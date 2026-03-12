import { useState, useRef, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import api from "@/api/inboxAiClient";
import { startRingtone, stopRingtone } from "@/lib/useNotificationSettings";
import { callEventEmitter } from "@/lib/pushNotifications";

function getNotifSettings() {
  try {
    const raw = localStorage.getItem("con_notif_settings");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// On Android, verify mic access before trying to init Telnyx.
// getUserMedia triggers the Android runtime permission dialog AND grants
// the WebView's RESOURCE_AUDIO_CAPTURE so WebRTC can actually use the mic.
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

  const clientRef     = useRef(null);
  const callRef       = useRef(null);
  const timerRef      = useRef(null);
  const startTimeRef  = useRef(null);
  const keepAliveRef  = useRef(null);
  const tokenRef      = useRef(null);
  const mountedRef    = useRef(true);
  const remoteAudioRef = useRef(null); // hidden <audio> for remote call audio

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); };

  // ── Core init (called on mount + on reconnect) ──────────────────────────────
  const initTelnyx = useCallback(async (token) => {
    if (!mountedRef.current) return;

    let TelnyxRTC;
    try {
      const mod = await import("@telnyx/webrtc");
      TelnyxRTC = mod.TelnyxRTC;
    } catch {
      TelnyxRTC = window?.TelnyxWebRTC?.TelnyxRTC;
    }
    if (!TelnyxRTC || !mountedRef.current) return;

    // Tear down any previous client
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
      clientRef.current = null;
    }
    clearInterval(keepAliveRef.current);

    // Ensure a hidden audio element exists BEFORE constructing TelnyxRTC
    // so we can pass its ID as remoteElement — SDK auto-attaches remote stream
    if (!remoteAudioRef.current) {
      let el = document.getElementById('telnyx-remote-audio');
      if (!el) {
        el = document.createElement('audio');
        el.id = 'telnyx-remote-audio';
        el.autoplay = true;
        el.setAttribute('playsinline', '');
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      remoteAudioRef.current = el;
    }

    const client = new TelnyxRTC({
      login_token: token,
      // Tell the SDK which audio element to pipe remote audio into
      remoteElement: remoteAudioRef.current,
    });
    clientRef.current = client;

    client.on("telnyx.ready", () => {
      if (!mountedRef.current) return;
      setStatus("ready");
      // Keep-alive ping every 25s to prevent WebSocket idle timeout on mobile
      keepAliveRef.current = setInterval(() => {
        try { client.webSocket?.send?.('{"jsonrpc":"2.0","method":"ping","id":1}'); } catch {}
      }, 25000);
    });

    client.on("telnyx.error", (err) => {
      console.warn("[Phone] telnyx.error:", err);
      if (mountedRef.current) setStatus("idle");
    });

    client.on("telnyx.socket.close", () => {
      clearInterval(keepAliveRef.current);
      if (!mountedRef.current) return;
      setStatus("reconnecting");
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (mountedRef.current && tokenRef.current) initTelnyx(tokenRef.current);
      }, 3000);
    });

    client.on("telnyx.notification", (notif) => {
      if (!mountedRef.current || notif.type !== "callUpdate") return;
      const call = notif.call;
      const st = call.state;

      if (st === "ringing" && !callRef.current) {
        // Inbound call
        callRef.current = call;
        const name = call.options?.remoteCallerName || call.options?.remoteCallerNumber || "Unknown";
        setInboundCall({ name, number: call.options?.remoteCallerNumber || "" });
        setCallControlId(call.id || call.options?.call_control_id || null);
        setStatus("ringing");
        startRingtone({ ringOnCall: true, ringtone: "classic", ringVolume: 80, vibrateOnCall: true, ...getNotifSettings() });
        if (Notification?.permission === "granted") {
          new Notification("Incoming Call", { body: name, icon: "/favicon.ico", tag: "incoming-call", renotify: false });
        }
      } else if (st === "ringing" && callRef.current) {
        // Outbound call — remote is ringing, keep status as "calling" (already set)
        setStatus("calling");
      } else if (st === "active") {
        stopRingtone();
        setInboundCall(null);
        setCallControlId(call.id || call.options?.call_control_id || null);
        setStatus("active");
        startTimer();
        // Attach remote audio stream — try multiple paths the SDK may expose
        try {
          const stream =
            call.remoteStream ||
            call.options?.remoteStream ||
            call.peer?.getRemoteStreams?.()?.[0] ||
            call.peer?.remoteStream ||
            call.mediaStream;
          const audioEl = remoteAudioRef.current || document.getElementById('telnyx-remote-audio');
          if (stream && audioEl) {
            audioEl.srcObject = stream;
            audioEl.play().catch(() => {});
            console.log('[Phone] Remote audio stream attached');
          } else {
            console.warn('[Phone] No remote stream found at active state', { stream, audioEl });
          }
        } catch (e) { console.warn('[Phone] remoteStream attach failed:', e.message); }
      } else if (st === "done" || st === "destroy") {
        stopRingtone();
        callRef.current = null;
        setInboundCall(null);
        setCallControlId(null);
        setStatus("ready");
        stopTimer();
        setElapsed(0);
        setIsMuted(false);
        setIsOnHold(false);
        setActiveName("");
        setActiveNumber("");
        // Clear remote audio stream
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null; }
      }
    });

    client.connect();
  }, []);

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        // On Android, request mic access before Telnyx so the WebView's
        // RESOURCE_AUDIO_CAPTURE is pre-authorized when WebRTC needs it.
        if (Capacitor.isNativePlatform()) {
          const ok = await ensureMicPermission();
          if (!ok) {
            setMicDenied(true);
            setStatus("idle");
            return;
          }
        }

        const data = await api.getPhoneToken();
        if (!data?.token || !mountedRef.current) return;
        tokenRef.current = data.token;
        setPhoneNumber(data.phone_number);
        setStatus("connecting");
        await initTelnyx(data.token);
      } catch (e) {
        console.warn("Telnyx init:", e.message);
        if (mountedRef.current) setStatus("idle");
      }
    })();

    return () => {
      mountedRef.current = false;
      stopTimer();
      clearInterval(keepAliveRef.current);
      try { clientRef.current?.disconnect(); } catch {}
    };
  }, [initTelnyx]);

  // ── FCM wake: reconnect Telnyx when app is opened from an incoming-call push ─
  useEffect(() => {
    const handler = async () => {
      if (!mountedRef.current || !tokenRef.current) return;
      // Only reconnect if we're not already connected
      const st = clientRef.current?.connected ?? clientRef.current?.isConnected;
      if (!st) {
        console.log('[Phone] FCM wake — reconnecting Telnyx');
        setStatus('connecting');
        await initTelnyx(tokenRef.current);
      }
    };
    callEventEmitter.addEventListener('incoming_call', handler);
    return () => callEventEmitter.removeEventListener('incoming_call', handler);
  }, [initTelnyx]);

  const makeCall = useCallback((number, name) => {
    if (!clientRef.current) return;
    // Normalise to E.164 — prepend +1 if it looks like a 10-digit North American number
    let dest = number.replace(/\D/g, '');
    if (dest.length === 10) dest = '1' + dest;
    if (!dest.startsWith('+')) dest = '+' + dest;
    const call = clientRef.current.newCall({ destinationNumber: dest, callerNumber: phoneNumber || "" });
    callRef.current = call;
    setCallControlId(call.id || null);
    setActiveNumber(number);
    setActiveName(name || number);
    setStatus("calling"); // "calling" = dialing out, not yet active
  }, [phoneNumber]);

  const answerCall = useCallback(() => {
    stopRingtone();
    callRef.current?.answer();
    setStatus("active");
    setActiveName(inboundCall?.name || "");
    setActiveNumber(inboundCall?.number || "");
    setInboundCall(null);
    startTimer();
  }, [inboundCall]);

  const hangup = useCallback(() => {
    stopRingtone();
    callRef.current?.hangup();
    callRef.current = null;
    stopTimer();
    setStatus("ready");
    setElapsed(0);
    setIsMuted(false);
    setIsOnHold(false);
    setActiveName("");
    setActiveNumber("");
    setInboundCall(null);
    setCallControlId(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (!callRef.current) return;
    isMuted ? callRef.current.unmuteAudio() : callRef.current.muteAudio();
    setIsMuted(m => !m);
  }, [isMuted]);

  const toggleHold = useCallback(() => {
    if (!callRef.current) return;
    isOnHold ? callRef.current.unhold() : callRef.current.hold();
    setIsOnHold(h => !h);
    setStatus(prev => prev === "held" ? "active" : "held");
  }, [isOnHold]);

  const sendDtmf   = useCallback((digit) => callRef.current?.dtmf(digit), []);
  const blindTransfer = useCallback((dest) => { callRef.current?.transfer(dest); hangup(); }, [hangup]);

  const fmtElapsed = () => {
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  return {
    status, activeName, activeNumber, elapsed, fmtElapsed,
    isMuted, isOnHold, inboundCall, phoneNumber, callControlId, micDenied,
    makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer,
  };
}
