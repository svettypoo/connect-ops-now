import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/api/inboxAiClient";
import { startRingtone, stopRingtone } from "@/lib/useNotificationSettings";

// Load notification settings on demand (avoids circular dep)
function getNotifSettings() {
  try {
    const raw = localStorage.getItem("con_notif_settings");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function usePhone() {
  const [status, setStatus] = useState("idle");
  const [activeName, setActiveName] = useState("");
  const [activeNumber, setActiveNumber] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [inboundCall, setInboundCall] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [callControlId, setCallControlId] = useState(null);

  const clientRef = useRef(null);
  const callRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };
  const stopTimer = () => { clearInterval(timerRef.current); };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.getPhoneToken();
        if (!data?.token || !mounted) return;
        setPhoneNumber(data.phone_number);
        setStatus("connecting");

        let TelnyxRTC;
        try {
          const mod = await import("@telnyx/webrtc");
          TelnyxRTC = mod.TelnyxRTC;
        } catch {
          TelnyxRTC = window?.TelnyxWebRTC?.TelnyxRTC;
        }
        if (!TelnyxRTC || !mounted) return;

        const client = new TelnyxRTC({ login_token: data.token });
        clientRef.current = client;

        client.on("telnyx.ready", () => mounted && setStatus("ready"));
        client.on("telnyx.error", () => mounted && setStatus("idle"));
        client.on("telnyx.socket.close", () => mounted && setStatus("idle"));

        client.on("telnyx.notification", (notif) => {
          if (!mounted || notif.type !== "callUpdate") return;
          const call = notif.call;
          const st = call.state;
          if (st === "ringing" && !callRef.current) {
            callRef.current = call;
            const name = call.options?.remoteCallerName || call.options?.remoteCallerNumber || "Unknown";
            setInboundCall({ name, number: call.options?.remoteCallerNumber || "" });
            setCallControlId(call.id || call.options?.call_control_id || null);
            setStatus("ringing");
            // Fire ringtone + vibration using saved prefs
            startRingtone({ ringOnCall: true, ringtone: "classic", ringVolume: 80, vibrateOnCall: true, ...getNotifSettings() });
            // Browser notification (if permission granted)
            if (Notification?.permission === "granted") {
              new Notification("Incoming Call", { body: name, icon: "/favicon.ico", tag: "incoming-call", renotify: false });
            }
          } else if (st === "active") {
            stopRingtone();
            setInboundCall(null);
            setCallControlId(call.id || call.options?.call_control_id || null);
            setStatus("active");
            startTimer();
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
          }
        });
        client.connect();
      } catch (e) {
        console.warn("Telnyx init:", e.message);
        if (mounted) setStatus("idle");
      }
    })();
    return () => { mounted = false; stopTimer(); clientRef.current?.disconnect(); };
  }, []);

  const makeCall = useCallback((number, name) => {
    if (!clientRef.current) return;
    const call = clientRef.current.newCall({ destinationNumber: number, callerNumber: phoneNumber || "" });
    callRef.current = call;
    setCallControlId(call.id || null);
    setActiveNumber(number);
    setActiveName(name || number);
    setStatus("active");
    startTimer();
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

  const sendDtmf = useCallback((digit) => callRef.current?.dtmf(digit), []);
  const blindTransfer = useCallback((dest) => { callRef.current?.transfer(dest); hangup(); }, [hangup]);

  const fmtElapsed = () => {
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
  };

  return { status, activeName, activeNumber, elapsed, fmtElapsed, isMuted, isOnHold,
    inboundCall, phoneNumber, callControlId, makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer };
}
