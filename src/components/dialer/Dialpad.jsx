import { useState } from "react";
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
