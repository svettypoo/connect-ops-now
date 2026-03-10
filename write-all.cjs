const fs = require('fs');
const base = 'C:/Users/pargo_pxnd4wa/connect-ops-now/src';
const files = {};

// ── usePhone.js ──────────────────────────────────────────────────────────────
files['lib/usePhone.js'] = `import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/api/inboxAiClient";

export function usePhone() {
  const [status, setStatus] = useState("idle");
  const [activeName, setActiveName] = useState("");
  const [activeNumber, setActiveNumber] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [inboundCall, setInboundCall] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);

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
            setStatus("ringing");
          } else if (st === "active") {
            setInboundCall(null);
            setStatus("active");
            startTimer();
          } else if (st === "done" || st === "destroy") {
            callRef.current = null;
            setInboundCall(null);
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
    setActiveNumber(number);
    setActiveName(name || number);
    setStatus("active");
    startTimer();
  }, [phoneNumber]);

  const answerCall = useCallback(() => {
    callRef.current?.answer();
    setStatus("active");
    setActiveName(inboundCall?.name || "");
    setActiveNumber(inboundCall?.number || "");
    setInboundCall(null);
    startTimer();
  }, [inboundCall]);

  const hangup = useCallback(() => {
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
    inboundCall, phoneNumber, makeCall, answerCall, hangup, toggleMute, toggleHold, sendDtmf, blindTransfer };
}
`;

// ── VoiceCall.jsx ────────────────────────────────────────────────────────────
files['components/dialer/VoiceCall.jsx'] = `import { useState, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, PauseCircle, PlayCircle, ArrowRightLeft, Keyboard, FileText } from "lucide-react";
import { usePhone } from "@/lib/usePhone";
import CallNotes from "@/components/dialer/CallNotes";

export default function VoiceCall({ dialTo, dialName, onCallEnd }) {
  const phone = usePhone();
  const [showDtmf, setShowDtmf] = useState(false);
  const [dtmfInput, setDtmfInput] = useState("");
  const [sessionId] = useState(() => "voice-" + Date.now());
  const [transcript, setTranscript] = useState([]);
  const recognitionRef = useRef(null);

  // Auto-call if dialTo passed in
  const prevDialToRef = useRef(null);
  if (dialTo && dialTo !== prevDialToRef.current && phone.status === "ready") {
    prevDialToRef.current = dialTo;
    phone.makeCall(dialTo, dialName);
    startTranscription();
  }

  function startTranscription() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      const finals = Array.from(e.results).filter(x => x.isFinal).map(x => x[0].transcript.trim()).filter(Boolean);
      if (finals.length) setTranscript(prev => [...prev, ...finals]);
    };
    r.start();
    recognitionRef.current = r;
  }

  function stopTranscription() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  const handleHangup = () => {
    stopTranscription();
    phone.hangup();
    onCallEnd?.();
  };

  const pressKey = (k) => {
    setDtmfInput(d => d + k);
    phone.sendDtmf(k);
  };

  const isActive = phone.status === "active" || phone.status === "held";
  const isRinging = phone.status === "ringing";

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5 p-6 space-y-6">
      {/* Status indicator */}
      <div className="flex flex-col items-center gap-3">
        <div className={\`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all \${
          isActive ? "bg-green-600/20 border-green-500/50" : isRinging ? "bg-yellow-500/20 border-yellow-400/50 animate-pulse" : "bg-slate-700/50 border-slate-600"
        }\`}>
          <Phone className={\`w-9 h-9 \${isActive ? "text-green-400" : isRinging ? "text-yellow-400" : "text-slate-400"}\`} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg text-white">
            {isRinging ? (phone.inboundCall?.name || "Incoming…") : (phone.activeName || (phone.status === "ready" ? "Ready" : phone.status === "connecting" ? "Connecting…" : "Initializing…"))}
          </p>
          {isActive && (
            <div className="flex items-center gap-2 justify-center mt-1">
              <span className={\`w-2 h-2 rounded-full \${phone.status === "held" ? "bg-yellow-400" : "bg-green-400 animate-pulse"}\`} />
              <span className={\`text-sm font-mono \${phone.status === "held" ? "text-yellow-400" : "text-green-400"}\`}>
                {phone.status === "held" ? "On Hold" : phone.fmtElapsed()}
              </span>
            </div>
          )}
          {phone.phoneNumber && (
            <p className="text-slate-500 text-xs mt-1">{phone.phoneNumber}</p>
          )}
        </div>
        {isActive && (
          <div className="flex items-end gap-0.5 h-6">
            {[3,5,8,5,7,4,6,3,5,8,4,7].map((h,i) => (
              <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse"
                style={{ height: h*3+"px", animationDelay: i*0.07+"s" }} />
            ))}
          </div>
        )}
      </div>

      {/* Inbound call answer / reject */}
      {isRinging && (
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <button onClick={phone.answerCall} className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg">
              <Phone className="w-6 h-6 text-white" />
            </button>
            <span className="text-xs text-slate-400">Answer</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleHangup} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg">
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
            <span className="text-xs text-slate-400">Reject</span>
          </div>
        </div>
      )}

      {/* Active call controls */}
      {isActive && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <button onClick={phone.toggleMute}
              className={\`w-12 h-12 rounded-full flex items-center justify-center transition-all \${phone.isMuted ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}\`}
              title="Mute">
              {phone.isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
            <button onClick={handleHangup} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg">
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button onClick={phone.toggleHold}
              className={\`w-12 h-12 rounded-full flex items-center justify-center transition-all \${phone.isOnHold ? "bg-yellow-500/80" : "bg-white/10 hover:bg-white/20"}\`}
              title="Hold">
              {phone.isOnHold ? <PlayCircle className="w-5 h-5 text-white" /> : <PauseCircle className="w-5 h-5 text-white" />}
            </button>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowDtmf(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-all">
              <Keyboard className="w-3.5 h-3.5" /> Keypad
            </button>
            <button onClick={() => {
              const dest = window.prompt("Transfer to (number or extension):");
              if (dest) phone.blindTransfer(dest);
            }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-all">
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
            </button>
          </div>

          {/* DTMF keypad */}
          {showDtmf && (
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-center text-sm font-mono text-white mb-2 min-h-6">{dtmfInput || <span className="text-slate-600">Enter digits</span>}</div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k => (
                  <button key={k} onClick={() => pressKey(k)}
                    className="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all">
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live transcript */}
          {transcript.length > 0 && (
            <div className="bg-black/20 rounded-xl p-3 max-h-28 overflow-y-auto">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-500">Live Transcript</span>
              </div>
              {transcript.map((line, i) => <p key={i} className="text-xs text-slate-300">{line}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Post-call notes */}
      {!isActive && !isRinging && phone.elapsed > 0 && (
        <CallNotes sessionId={sessionId} callType="voice" durationMinutes={Math.round(phone.elapsed / 60)} transcript={transcript} />
      )}
    </div>
  );
}
`;

// ── VideoCall.jsx ─────────────────────────────────────────────────────────────
files['components/dialer/VideoCall.jsx'] = `import { useState, useEffect, useRef } from "react";
import { Video, Phone, PhoneOff, X } from "lucide-react";
import api from "@/api/inboxAiClient";
import CallNotes from "@/components/dialer/CallNotes";

const JAAS_APP_ID = "vpaas-magic-cookie-e866a734fd5742ea83b9df9d3fab8807";

export default function VideoCall({ contactName, meetingRoom }) {
  const [status, setStatus] = useState("idle"); // idle | loading | active
  const [sessionId] = useState(() => "video-" + Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [roomName, setRoomName] = useState(meetingRoom || "");
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const timerRef = useRef(null);

  const startTimer = () => {
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
  };

  const startCall = async () => {
    setError(null);
    setStatus("loading");
    try {
      // Get JWT from Inbox AI
      const { token } = await api.getJaaSToken();
      const room = roomName || ("ops-" + Date.now());
      setRoomName(room);

      // Load JaaS external API
      if (!window.JitsiMeetExternalAPI) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://8x8.vc/" + JAAS_APP_ID + "/external_api.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const api2 = new window.JitsiMeetExternalAPI("8x8.vc", {
        roomName: JAAS_APP_ID + "/" + room,
        parentNode: containerRef.current,
        jwt: token,
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
        interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","hangup","chat","tileview","fullscreen"] },
        userInfo: { displayName: contactName || "User" },
      });
      apiRef.current = api2;
      api2.addEventListener("videoConferenceJoined", () => { setStatus("active"); startTimer(); });
      api2.addEventListener("videoConferenceLeft", endCall);
    } catch (e) {
      setError("Failed to start video: " + e.message);
      setStatus("idle");
    }
  };

  const endCall = () => {
    clearInterval(timerRef.current);
    apiRef.current?.dispose();
    apiRef.current = null;
    setStatus("idle");
  };

  useEffect(() => () => { clearInterval(timerRef.current); apiRef.current?.dispose(); }, []);

  const fmt = (s) => String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5">
      {status === "idle" ? (
        <div className="flex flex-col items-center gap-4 p-8">
          <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center">
            <Video className="w-9 h-9 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">{contactName || "Video Call"}</p>
            <p className="text-slate-400 text-sm mt-1">HD video with virtual backgrounds</p>
          </div>
          {roomName && (
            <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-400">
              Room: <span className="text-[#0EB8FF]">{roomName}</span>
            </div>
          )}
          <input value={roomName} onChange={e => setRoomName(e.target.value)}
            placeholder="Custom room name (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0EB8FF]/40" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={startCall}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white flex items-center justify-center gap-2 transition-all">
            <Video className="w-5 h-5" /> Start Video Call
          </button>
        </div>
      ) : (
        <div className="relative">
          <div ref={containerRef} style={{ height: 420 }} />
          {status === "loading" && (
            <div className="absolute inset-0 bg-[#0d0d1f] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-600 border-t-[#0EB8FF] rounded-full animate-spin" />
            </div>
          )}
          {status === "active" && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white font-mono">{fmt(elapsed)}</span>
            </div>
          )}
        </div>
      )}
      {status === "idle" && elapsed > 0 && (
        <CallNotes sessionId={sessionId} callType="video" durationMinutes={Math.round(elapsed / 60)} />
      )}
    </div>
  );
}
`;

// ── Messaging.jsx ─────────────────────────────────────────────────────────────
files['components/dialer/Messaging.jsx'] = `import { useState, useRef, useEffect } from "react";
import { Send, Languages, Loader2, ArrowLeft, Lightbulb } from "lucide-react";
import api from "@/api/inboxAiClient";

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m ago";
  if (diff < 86400000) return Math.round(diff/3600000) + "h ago";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

export default function Messaging({ initialThread }) {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(initialThread || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getSmsThreads()
      .then(t => setThreads(Array.isArray(t) ? t : []))
      .catch(() => setThreads([]))
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    if (activeThread) loadMessages(activeThread.from_number || activeThread.number);
  }, [activeThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMessages = async (number) => {
    try {
      const msgs = await api.getSmsThread(number);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch { setMessages([]); }
  };

  const openThread = (t) => {
    setActiveThread(t);
    api.markThreadRead(t.from_number || t.number).catch(() => {});
    setThreads(prev => prev.map(x => (x.id === t.id ? { ...x, unread: 0 } : x)));
    setSuggestions([]);
  };

  const loadSuggestions = async () => {
    setLoadingSugg(true);
    try {
      const sugg = await api.getSmsReplySuggestions(activeThread.from_number || activeThread.number);
      setSuggestions(Array.isArray(sugg) ? sugg : []);
    } catch { setSuggestions([]); }
    setLoadingSugg(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeThread || sending) return;
    setSending(true);
    const to = activeThread.from_number || activeThread.number;
    const tempMsg = { id: "t" + Date.now(), direction: "outbound", body: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setInput("");

    try {
      await api.sendSms(to, text);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setInput(text);
    }
    setSending(false);
    setSuggestions([]);
  };

  const startNewThread = async () => {
    const num = newNumber.trim();
    if (!num) return;
    const t = { id: num, from_number: num, contact_name: num, last_message: "", unread: 0 };
    setActiveThread(t);
    setMessages([]);
    setShowNew(false);
    setNewNumber("");
  };

  if (activeThread) {
    const name = activeThread.contact_name || activeThread.name || activeThread.from_number || activeThread.number || "Unknown";
    return (
      <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5 flex flex-col" style={{ height: 500 }}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <button onClick={() => { setActiveThread(null); setMessages([]); setSuggestions([]); }}
            className="p-1 rounded-lg hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#0684BD] flex items-center justify-center text-xs font-bold text-white">
            {initials(name)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-slate-500">{activeThread.from_number || activeThread.number}</p>
          </div>
          <button onClick={loadSuggestions} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 transition-all">
            {loadingSugg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
            Suggest
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && <p className="text-slate-600 text-sm text-center py-8">No messages yet</p>}
          {messages.map((m, i) => {
            const out = m.direction === "outbound" || m.out;
            return (
              <div key={m.id || i} className={\`flex \${out ? "justify-end" : "justify-start"}\`}>
                <div className={\`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm \${out ? "bg-[#0684BD] text-white" : "bg-slate-700/80 text-slate-100"}\`}>
                  {m.body || m.text}
                  <div className={\`text-xs mt-1 \${out ? "text-blue-200/70" : "text-slate-500"}\`}>{fmtTime(m.created_at || m.time || Date.now())}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {suggestions.length > 0 && (
          <div className="px-3 py-2 border-t border-white/5 flex gap-2 overflow-x-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-white/5 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0EB8FF]/40" />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#0684BD] hover:bg-[#0EB8FF] disabled:opacity-40 flex items-center justify-center transition-all">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5 flex flex-col" style={{ height: 500 }}>
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-white">Messages</span>
        </div>
        <button onClick={() => setShowNew(p => !p)}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0684BD]/20 hover:bg-[#0684BD]/40 text-[#0EB8FF] transition-all text-lg font-bold">+</button>
      </div>

      {showNew && (
        <div className="px-4 py-3 border-b border-white/5 flex gap-2">
          <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="+1 (555) 000-0000"
            onKeyDown={e => e.key === "Enter" && startNewThread()}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none" />
          <button onClick={startNewThread} className="px-3 py-2 rounded-lg bg-[#0684BD] text-white text-xs font-semibold">New</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loadingThreads && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-600 border-t-[#0EB8FF] rounded-full animate-spin" /></div>}
        {!loadingThreads && threads.length === 0 && <p className="text-slate-600 text-sm text-center py-12">No conversations yet</p>}
        {threads.map(t => {
          const name = t.contact_name || t.name || t.from_number || t.number || "Unknown";
          return (
            <button key={t.id} onClick={() => openThread(t)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 border-l-2 border-transparent hover:border-[#0EB8FF] transition-all">
              <div className="w-9 h-9 rounded-full bg-[#0684BD] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {initials(name)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{name}</span>
                  {t.last_message_at && <span className="text-[10px] text-slate-600">{fmtTime(t.last_message_at)}</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">{t.last_message || t.lastMsg || ""}</p>
              </div>
              {t.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#0684BD] flex items-center justify-center text-[10px] font-bold text-white">{t.unread}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
`;

// ── CallNotes.jsx ─────────────────────────────────────────────────────────────
files['components/dialer/CallNotes.jsx'] = `import { useState, useEffect } from "react";
import { Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/api/inboxAiClient";

export default function CallNotes({ sessionId, callType, durationMinutes, transcript }) {
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { generateNotes(); }, []);

  const generateNotes = async () => {
    setLoading(true);
    try {
      const transcriptContext = transcript?.length ? "\\nTranscript:\\n" + transcript.join("\\n") : "";
      const res = await api.askAI(
        \`Generate a professional post-call summary for a \${callType || "voice"} call lasting ~\${durationMinutes || 1} minute(s).\${transcriptContext}\\nRespond with JSON: { "summary": "...", "key_points": ["..."], "action_items": ["..."] }\`
      );
      const text = typeof res === "string" ? res : JSON.stringify(res);
      const match = text.match(/\\{[\\s\\S]*\\}/);
      if (match) {
        try { setNotes(JSON.parse(match[0])); } catch {}
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4 px-4 pb-4">
      <button onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#0EB8FF]" /> : <FileText className="w-4 h-4 text-[#0EB8FF]" />}
        <span className="font-medium">{loading ? "Generating AI call notes…" : "AI Call Notes"}</span>
        {!loading && (expanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />)}
      </button>
      {!loading && expanded && notes && (
        <div className="mt-3 space-y-3 text-sm">
          {notes.summary && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Summary</p>
              <p className="text-slate-200">{notes.summary}</p>
            </div>
          )}
          {notes.key_points?.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Key Points</p>
              {notes.key_points.map((pt, i) => (
                <p key={i} className="text-slate-200 flex gap-2"><span className="text-[#0EB8FF]">•</span>{pt}</p>
              ))}
            </div>
          )}
          {notes.action_items?.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Action Items</p>
              {notes.action_items.map((it, i) => (
                <p key={i} className="text-slate-200 flex gap-2"><span className="text-green-400">✓</span>{it}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
`;

// ── Dialpad.jsx ───────────────────────────────────────────────────────────────
files['components/dialer/Dialpad.jsx'] = `import { useState } from "react";
import { PhoneCall, Delete } from "lucide-react";

const KEYS = [
  { key: "1", sub: "" }, { key: "2", sub: "ABC" }, { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" }, { key: "5", sub: "JKL" }, { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" }, { key: "8", sub: "TUV" }, { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" }, { key: "0", sub: "+" }, { key: "#", sub: "" },
];

export default function Dialpad({ onCall, phoneStatus, phoneNumber }) {
  const [number, setNumber] = useState("");

  const pressKey = (k) => setNumber(n => n + k);
  const backspace = () => setNumber(n => n.slice(0, -1));
  const handleCall = () => { if (number.trim()) onCall?.(number.trim(), ""); };

  const busy = phoneStatus === "active" || phoneStatus === "held" || phoneStatus === "ringing";

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Number display */}
      <div className="w-full relative">
        <input value={number} onChange={e => setNumber(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCall()}
          placeholder="Enter number"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#0EB8FF]/50 pr-12"
        />
        {number && (
          <button onClick={backspace} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
            <Delete className="w-5 h-5" />
          </button>
        )}
      </div>

      {phoneNumber && (
        <p className="text-xs text-slate-600">Your number: <span className="text-slate-400">{phoneNumber}</span></p>
      )}

      {/* 12-key pad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map(({ key, sub }) => (
          <button key={key} onClick={() => pressKey(key)}
            className="aspect-square rounded-2xl bg-white/5 hover:bg-white/12 active:scale-95 flex flex-col items-center justify-center gap-0.5 transition-all border border-white/5 hover:border-white/10">
            <span className="text-white text-xl font-semibold leading-none">{key}</span>
            {sub && <span className="text-slate-600 text-[9px] tracking-widest">{sub}</span>}
          </button>
        ))}
      </div>

      {/* Call button */}
      <button onClick={handleCall} disabled={!number.trim() || busy}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
        <PhoneCall className="w-7 h-7 text-white" />
      </button>

      {busy && (
        <p className="text-xs text-yellow-400 animate-pulse">
          {phoneStatus === "ringing" ? "Incoming call…" : phoneStatus === "active" ? "In call" : "On hold"}
        </p>
      )}
    </div>
  );
}
`;

// ── CallHistory.jsx ────────────────────────────────────────────────────────────
files['components/dialer/CallHistory.jsx'] = `import { useState, useEffect } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall, Loader2, Trash2 } from "lucide-react";
import api from "@/api/inboxAiClient";

function fmtTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m ago";
  if (diff < 86400000) return Math.round(diff/3600000) + "h ago";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function fmtDur(secs) {
  if (!secs) return "";
  const m = Math.floor(secs/60), s = secs%60;
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "missed", label: "Missed" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
];

export default function CallHistory({ onCallBack }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getCallLogs(filter === "all" ? null : filter);
      setLogs(Array.isArray(data) ? data : []);
    } catch { setLogs([]); }
    setLoading(false);
  };

  const deleteLog = async (id, e) => {
    e.stopPropagation();
    await api.deleteCallLog(id).catch(() => {});
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const Icon = ({ dir, status }) => {
    const cls = "w-4 h-4";
    if (status === "missed") return <PhoneMissed className={cls + " text-red-400"} />;
    if (dir === "inbound") return <PhoneIncoming className={cls + " text-green-400"} />;
    return <PhoneOutgoing className={cls + " text-[#0EB8FF]"} />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-white/5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${filter === f.id ? "bg-[#0684BD]/30 text-[#0EB8FF]" : "text-slate-500 hover:text-slate-300"}\`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>}
        {!loading && logs.length === 0 && <p className="text-slate-600 text-sm text-center py-12">No calls</p>}
        {logs.map(log => {
          const name = (log.direction === "inbound" ? log.from_name : log.to_name) || (log.direction === "inbound" ? log.from_number : log.to_number) || "Unknown";
          const number = log.direction === "inbound" ? log.from_number : log.to_number;
          return (
            <div key={log.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-all border-b border-white/3">
              <div className={\`w-8 h-8 rounded-full flex items-center justify-center \${
                log.status === "missed" ? "bg-red-500/15" : log.direction === "inbound" ? "bg-green-500/15" : "bg-[#0684BD]/15"
              }\`}>
                <Icon dir={log.direction} status={log.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={\`text-sm font-medium truncate \${log.status === "missed" ? "text-red-400" : "text-white"}\`}>{name}</p>
                <p className="text-xs text-slate-500">{number}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-slate-600">{fmtTime(log.started_at || log.created_at)}</span>
                {log.duration > 0 && <span className="text-[10px] text-slate-600">{fmtDur(log.duration)}</span>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onCallBack?.(number, name)}
                  className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 transition-all" title="Call back">
                  <PhoneCall className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button onClick={(e) => deleteLog(log.id, e)}
                  className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-all" title="Delete">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

// ── VoicemailList.jsx ──────────────────────────────────────────────────────────
files['components/dialer/VoicemailList.jsx'] = `import { useState, useEffect } from "react";
import { Voicemail, Play, PhoneCall, Loader2, CheckCircle } from "lucide-react";
import api from "@/api/inboxAiClient";

function fmtTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m ago";
  if (diff < 86400000) return Math.round(diff/3600000) + "h ago";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function fmtDur(secs) {
  if (!secs) return "";
  const m = Math.floor(secs/60), s = secs%60;
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

export default function VoicemailList({ onCallBack }) {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    api.getVoicemails()
      .then(d => setVms(Array.isArray(d) ? d : []))
      .catch(() => setVms([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    api.markVoicemailRead(id).catch(() => {});
    setVms(prev => prev.map(v => v.id === id ? { ...v, is_read: true } : v));
  };

  const playVm = (vm) => {
    if (playing === vm.id) { setPlaying(null); return; }
    markRead(vm.id);
    setPlaying(vm.id);
    const audio = new Audio(api.getVoicemailAudio(vm.id));
    audio.play().catch(() => {});
    audio.addEventListener("ended", () => setPlaying(null));
  };

  const unreadCount = vms.filter(v => !v.is_read).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Voicemail className="w-4 h-4 text-[#0EB8FF]" />
        <span className="text-sm font-medium text-white">Voicemail</span>
        {unreadCount > 0 && (
          <span className="ml-auto w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">{unreadCount}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>}
        {!loading && vms.length === 0 && <p className="text-slate-600 text-sm text-center py-12">No voicemails</p>}
        {vms.map(vm => (
          <div key={vm.id} onClick={() => markRead(vm.id)}
            className={\`flex items-start gap-3 px-4 py-4 border-b border-white/3 transition-all cursor-pointer \${!vm.is_read ? "bg-white/3 hover:bg-white/6" : "hover:bg-white/4"}\`}>
            <div className={\`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 \${!vm.is_read ? "bg-red-500/20" : "bg-white/5"}\`}>
              <Voicemail className={\`w-4 h-4 \${!vm.is_read ? "text-red-400" : "text-slate-500"}\`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={\`text-sm font-medium \${!vm.is_read ? "text-white" : "text-slate-300"}\`}>
                  {vm.contact_name || vm.from_number || "Unknown"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600">{fmtTime(vm.created_at)}</span>
                  {vm.is_read && <CheckCircle className="w-3.5 h-3.5 text-slate-600" />}
                </div>
              </div>
              {vm.transcript && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{vm.transcript}</p>}
              {vm.ai_summary && !vm.transcript && <p className="text-xs text-slate-400 line-clamp-2 mb-2 italic">{vm.ai_summary}</p>}
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); playVm(vm); }}
                  className={\`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all \${
                    playing === vm.id ? "bg-[#0684BD]/40 text-[#0EB8FF]" : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }\`}>
                  <Play className="w-3 h-3" />
                  {playing === vm.id ? "Playing…" : fmtDur(vm.duration) || "Play"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onCallBack?.(vm.from_number, vm.contact_name); }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium transition-all">
                  <PhoneCall className="w-3 h-3" /> Call back
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

// ── RCSidebar.jsx ─────────────────────────────────────────────────────────────
files['components/rc/RCSidebar.jsx'] = `import { MessageSquare, Phone, Video, Users, Settings, Bell, Voicemail, Hash } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { id: "message", icon: MessageSquare, label: "Messages" },
  { id: "dialpad", icon: Hash, label: "Dialpad" },
  { id: "recent", icon: Phone, label: "Recent Calls" },
  { id: "voicemail", icon: Voicemail, label: "Voicemail" },
  { id: "video", icon: Video, label: "Video" },
  { id: "contacts", icon: Users, label: "Contacts" },
];

export default function RCSidebar({ activeNav, setActiveNav, vmUnread }) {
  const { user, logout } = useAuth();
  const initials = (name) => (name||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="w-[60px] flex flex-col items-center py-3 gap-1 bg-[#141428] border-r border-white/5">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B00, #FF8C38)" }}>
        <span className="font-black text-white text-lg">C</span>
      </div>

      {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
        <button key={id} onClick={() => setActiveNav(id)} title={label}
          className={\`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group \${
            activeNav === id ? "bg-[#0684BD]/20 text-[#0EB8FF]" : "text-slate-500 hover:text-slate-300 rc-hover"
          }\`}>
          {activeNav === id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#0EB8FF]" />}
          <Icon className="w-5 h-5" />
          {id === "voicemail" && vmUnread > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">{vmUnread}</span>
          )}
          <span className="absolute left-14 bg-[#2a2a45] text-xs text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">{label}</span>
        </button>
      ))}

      <div className="flex-1" />
      <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 rc-hover">
        <Bell className="w-5 h-5" />
      </button>
      <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 rc-hover">
        <Settings className="w-5 h-5" />
      </button>
      <button onClick={logout} title="Sign out"
        className="w-8 h-8 rounded-full mt-1 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80">
        {initials(user?.name || user?.email)}
      </button>
    </div>
  );
}
`;

// ── RCListPanel.jsx ───────────────────────────────────────────────────────────
files['components/rc/RCListPanel.jsx'] = `import { useState, useEffect } from "react";
import { Search, Plus, Star, PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2 } from "lucide-react";
import api from "@/api/inboxAiClient";

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts), diff = Date.now() - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m";
  if (diff < 86400000) return Math.round(diff/3600000) + "h";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

const SECTION_META = {
  message: { title: "Messages", ph: "Search messages…" },
  recent: { title: "Recent Calls", ph: "Search calls…" },
  dialpad: { title: "Dialpad", ph: "Quick dial…" },
  voicemail: { title: "Voicemail", ph: "Search voicemails…" },
  video: { title: "Video", ph: "Search meetings…" },
  contacts: { title: "Contacts", ph: "Search contacts…" },
};

export default function RCListPanel({ activeNav, selectedContact, setSelectedContact }) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { title, ph } = SECTION_META[activeNav] || SECTION_META.message;

  useEffect(() => {
    setSearch("");
    loadData();
  }, [activeNav]);

  const loadData = async () => {
    setLoading(true);
    setItems([]);
    try {
      if (activeNav === "message") {
        const d = await api.getSmsThreads();
        setItems(Array.isArray(d) ? d.map(t => ({
          id: t.id, name: t.contact_name || t.from_number || "?",
          sub: t.last_message || "", time: t.last_message_at, unread: t.unread || 0,
          status: "active", _raw: t,
        })) : []);
      } else if (activeNav === "recent") {
        const d = await api.getCallLogs();
        setItems(Array.isArray(d) ? d.slice(0, 50).map(l => {
          const name = (l.direction==="inbound" ? l.from_name : l.to_name) || (l.direction==="inbound" ? l.from_number : l.to_number) || "?";
          return { id: l.id, name, sub: l.status === "missed" ? "Missed" : l.direction, time: l.started_at, status: l.status, _raw: l };
        }) : []);
      } else if (activeNav === "contacts") {
        const d = await api.getContacts();
        setItems(Array.isArray(d) ? d.map(c => ({
          id: c.id, name: c.name || c.phone, sub: c.phone, status: "offline", _raw: c,
        })) : []);
      } else if (activeNav === "voicemail") {
        const d = await api.getVoicemails();
        setItems(Array.isArray(d) ? d.map(v => ({
          id: v.id, name: v.contact_name || v.from_number || "?",
          sub: v.transcript?.slice(0,60) || "", time: v.created_at,
          unread: v.is_read ? 0 : 1, status: "offline", _raw: v,
        })) : []);
      } else if (activeNav === "video") {
        const d = await api.getMeetings();
        setItems(Array.isArray(d) ? d.map(m => ({
          id: m.id, name: m.title || "Meeting", sub: m.join_code, time: m.scheduled_at, status: "active", _raw: m,
        })) : []);
      }
    } catch { setItems([]); }
    setLoading(false);
  };

  const filtered = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || (it.sub||"").toLowerCase().includes(search.toLowerCase()));

  const STATUS_DOT = { active: "bg-green-400", away: "bg-yellow-400", offline: "bg-slate-600", missed: "bg-red-400" };

  return (
    <div className="w-[260px] flex flex-col bg-[#181830] border-r border-white/5">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px] text-white">{title}</h2>
          <button onClick={loadData} className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0684BD]/20 hover:bg-[#0684BD]/40 text-[#0EB8FF] transition-all text-lg font-bold">↻</button>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ph}
            className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-full" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-500 animate-spin" /></div>}
        {!loading && filtered.length === 0 && activeNav !== "dialpad" && (
          <p className="text-slate-600 text-xs text-center py-8">Nothing here yet</p>
        )}
        {activeNav === "dialpad" && (
          <p className="text-slate-600 text-xs text-center py-8">Use the dialpad to place a call</p>
        )}
        {filtered.map(item => (
          <button key={item.id} onClick={() => setSelectedContact({ ...item._raw, name: item.name, status: item.status || "offline" })}
            className={\`w-full flex items-center gap-3 px-4 py-3 transition-all \${
              selectedContact?.id === item.id ? "bg-white/8 border-l-2 border-[#0EB8FF]" : "hover:bg-white/4 border-l-2 border-transparent"
            }\`}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                {initials(item.name)}
              </div>
              <div className={\`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#181830] \${STATUS_DOT[item.status] || "bg-slate-600"}\`} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <span className={\`text-sm font-medium truncate \${item.status === "missed" ? "text-red-400" : "text-white"}\`}>{item.name}</span>
                <span className="text-[10px] text-slate-600 ml-1 flex-shrink-0">{fmtTime(item.time)}</span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{item.sub}</p>
            </div>
            {item.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-[#0684BD] flex items-center justify-center text-[10px] font-bold text-white">{item.unread}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
`;

// ── RCContactPanel.jsx ────────────────────────────────────────────────────────
files['components/rc/RCContactPanel.jsx'] = `import { Phone, Video, Mail, MessageSquare } from "lucide-react";

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }

export default function RCContactPanel({ contact, onCall, onVideo, onMessage }) {
  if (!contact) return null;
  const STATUS_LABEL = { active: "Active now", away: "Away", offline: "Offline" };
  const STATUS_COLOR = { active: "text-green-400", away: "text-yellow-400", offline: "text-slate-500" };
  const phone = contact.phone || contact.from_number || contact.to_number || "";
  const email = contact.email || ((contact.name||"").toLowerCase().replace(" ",".") + "@company.com");

  return (
    <div className="w-[220px] flex flex-col bg-[#181830] border-l border-white/5 p-4">
      <div className="flex flex-col items-center text-center mb-5 pt-2">
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
            {initials(contact.name || "?")}
          </div>
          <div className={\`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-[#181830] \${
            contact.status === "active" ? "bg-green-400" : contact.status === "away" ? "bg-yellow-400" : "bg-slate-500"
          }\`} />
        </div>
        <h3 className="font-semibold text-sm text-white">{contact.name || "Unknown"}</h3>
        <p className={\`text-xs mt-0.5 \${STATUS_COLOR[contact.status] || STATUS_COLOR.offline}\`}>
          ● {STATUS_LABEL[contact.status] || "Offline"}
        </p>
      </div>

      <div className="flex justify-center gap-3 mb-5">
        {[
          { icon: Phone, label: "Call", action: () => onCall?.(phone, contact.name), color: "hover:bg-green-500/20" },
          { icon: Video, label: "Video", action: () => onVideo?.(contact.name), color: "hover:bg-blue-500/20" },
          { icon: MessageSquare, label: "SMS", action: () => onMessage?.(contact), color: "hover:bg-purple-500/20" },
          { icon: Mail, label: "Email", action: () => {}, color: "hover:bg-yellow-500/20" },
        ].map(({ icon: Icon, label, action, color }) => (
          <button key={label} onClick={action} className="flex flex-col items-center gap-1 group">
            <div className={\`w-9 h-9 rounded-xl bg-white/5 \${color} flex items-center justify-center transition-all\`}>
              <Icon className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </div>
            <span className="text-[10px] text-slate-600">{label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5">Contact Info</p>
          <div className="space-y-2">
            {phone && (
              <div className="bg-white/4 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-600">Phone</p>
                <p className="text-xs text-slate-300">{phone}</p>
              </div>
            )}
            {contact.extension && (
              <div className="bg-white/4 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-600">Extension</p>
                <p className="text-xs text-slate-300">Ext. {contact.extension}</p>
              </div>
            )}
            <div className="bg-white/4 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-600">Email</p>
              <p className="text-xs text-slate-300 truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// ── Dialer.jsx (main page) ────────────────────────────────────────────────────
files['pages/Dialer.jsx'] = `import { useState } from "react";
import RCSidebar from "@/components/rc/RCSidebar";
import RCContactPanel from "@/components/rc/RCContactPanel";
import RCListPanel from "@/components/rc/RCListPanel";
import VoiceCall from "@/components/dialer/VoiceCall";
import VideoCall from "@/components/dialer/VideoCall";
import Messaging from "@/components/dialer/Messaging";
import Dialpad from "@/components/dialer/Dialpad";
import CallHistory from "@/components/dialer/CallHistory";
import VoicemailList from "@/components/dialer/VoicemailList";
import { usePhone } from "@/lib/usePhone";

export default function Dialer() {
  const [activeNav, setActiveNav] = useState("dialpad");
  const [selectedContact, setSelectedContact] = useState(null);
  const [pendingCall, setPendingCall] = useState(null); // { number, name }
  const [pendingVideo, setPendingVideo] = useState(null);
  const [vmUnread, setVmUnread] = useState(0);
  const phone = usePhone();

  const handleCallBack = (number, name) => {
    setPendingCall({ number, name });
    setActiveNav("voice");
  };

  const handleContactCall = (number, name) => {
    setPendingCall({ number, name });
    setActiveNav("voice");
  };

  const handleContactVideo = (name) => {
    setPendingVideo(name);
    setActiveNav("video");
  };

  const handleContactMessage = (contact) => {
    setSelectedContact(contact);
    setActiveNav("message");
  };

  const renderMain = () => {
    switch (activeNav) {
      case "dialpad":
        return (
          <Dialpad
            onCall={(number, name) => { setPendingCall({ number, name }); setActiveNav("voice"); }}
            phoneStatus={phone.status}
            phoneNumber={phone.phoneNumber}
          />
        );
      case "recent":
        return <CallHistory onCallBack={handleCallBack} />;
      case "voicemail":
        return <VoicemailList onCallBack={handleCallBack} />;
      case "voice":
        return (
          <VoiceCall
            dialTo={pendingCall?.number}
            dialName={pendingCall?.name}
            onCallEnd={() => setPendingCall(null)}
          />
        );
      case "video":
        return <VideoCall contactName={pendingVideo || selectedContact?.name} />;
      case "message":
        return (
          <Messaging
            initialThread={selectedContact?.from_number ? selectedContact : null}
          />
        );
      case "contacts":
        return <div className="p-4 text-slate-400 text-sm">Select a contact from the list</div>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{\`
        .rc-glass { background: rgba(255,255,255,0.03); }
        .rc-hover:hover { background: rgba(255,255,255,0.07); }
        .rc-active { background: rgba(255,255,255,0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      \`}</style>

      <RCSidebar activeNav={activeNav} setActiveNav={setActiveNav} vmUnread={vmUnread} />

      {activeNav !== "dialpad" && activeNav !== "voice" && activeNav !== "video" && (
        <RCListPanel activeNav={activeNav} selectedContact={selectedContact} setSelectedContact={setSelectedContact} />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#1e1e30] overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#1e1e30] min-h-[52px]">
            <div className="flex items-center gap-3">
              {selectedContact ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-sm font-bold">
                    {(selectedContact.name||"?")[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{selectedContact.name}</p>
                    <p className="text-[10px] text-green-400">● {selectedContact.status === "active" ? "Active now" : "Offline"}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={\`w-2 h-2 rounded-full \${phone.status === "ready" || phone.status === "active" ? "bg-green-400 animate-pulse" : phone.status === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-slate-600"}\`} />
                  <span className="text-slate-400 text-sm capitalize">{phone.status}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedContact && activeNav === "message" && (
                <>
                  <button onClick={() => handleContactCall(selectedContact.phone || selectedContact.from_number || "", selectedContact.name)}
                    className="p-2 rounded-lg rc-hover transition-all" title="Voice call">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </button>
                  <button onClick={() => handleContactVideo(selectedContact.name)}
                    className="p-2 rounded-lg rc-hover transition-all" title="Video call">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 10l4.55-2.35A1 1 0 0121 8.58v6.84a1 1 0 01-1.45.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Inbound call banner */}
          {phone.inboundCall && (
            <div className="mx-4 mt-3 px-4 py-3 bg-green-900/30 border border-green-500/30 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Incoming call</p>
                <p className="text-xs text-green-400">{phone.inboundCall.name} — {phone.inboundCall.number}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { phone.answerCall(); setActiveNav("voice"); }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold">Answer</button>
                <button onClick={phone.hangup}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">Decline</button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {renderMain()}
          </div>
        </div>

        {selectedContact && activeNav !== "dialpad" && (
          <RCContactPanel
            contact={selectedContact}
            onCall={handleContactCall}
            onVideo={handleContactVideo}
            onMessage={handleContactMessage}
          />
        )}
      </div>
    </div>
  );
}
`;

// Write all files
let written = 0;
for (const [rel, content] of Object.entries(files)) {
  const full = base + '/' + rel;
  fs.mkdirSync(require('path').dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  written++;
}
console.log('Written ' + written + ' files');
