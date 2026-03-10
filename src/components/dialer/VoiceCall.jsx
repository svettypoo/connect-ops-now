import { useState, useRef } from "react";
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
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${
          isActive ? "bg-green-600/20 border-green-500/50" : isRinging ? "bg-yellow-500/20 border-yellow-400/50 animate-pulse" : "bg-slate-700/50 border-slate-600"
        }`}>
          <Phone className={`w-9 h-9 ${isActive ? "text-green-400" : isRinging ? "text-yellow-400" : "text-slate-400"}`} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg text-white">
            {isRinging ? (phone.inboundCall?.name || "Incoming…") : (phone.activeName || (phone.status === "ready" ? "Ready" : phone.status === "connecting" ? "Connecting…" : "Initializing…"))}
          </p>
          {isActive && (
            <div className="flex items-center gap-2 justify-center mt-1">
              <span className={`w-2 h-2 rounded-full ${phone.status === "held" ? "bg-yellow-400" : "bg-green-400 animate-pulse"}`} />
              <span className={`text-sm font-mono ${phone.status === "held" ? "text-yellow-400" : "text-green-400"}`}>
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
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${phone.isMuted ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}`}
              title="Mute">
              {phone.isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
            <button onClick={handleHangup} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg">
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button onClick={phone.toggleHold}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${phone.isOnHold ? "bg-yellow-500/80" : "bg-white/10 hover:bg-white/20"}`}
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
