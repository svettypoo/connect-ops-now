import { useState, useEffect } from "react";
import { PhoneCall, Delete, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import api from "@/api/inboxAiClient";

const KEYS = [
  { key: "1", sub: "" }, { key: "2", sub: "ABC" }, { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" }, { key: "5", sub: "JKL" }, { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" }, { key: "8", sub: "TUV" }, { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" }, { key: "0", sub: "+" }, { key: "#", sub: "" },
];

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts), diff = Date.now() - d;
  if (diff < 3600000) return Math.round(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.round(diff / 3600000) + "h ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dialpad({ onCall, phoneStatus, phoneNumber }) {
  const [number, setNumber] = useState("");
  const [recents, setRecents] = useState([]);
  const [matchedContact, setMatchedContact] = useState(null);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    api.getCallLogs().then(logs => {
      if (Array.isArray(logs)) {
        const seen = new Set();
        const unique = [];
        for (const l of logs) {
          const num = l.direction === "inbound" ? l.from_number : l.to_number;
          if (num && !seen.has(num)) { seen.add(num); unique.push(l); }
          if (unique.length >= 5) break;
        }
        setRecents(unique);
      }
    }).catch(() => {});
    api.getContacts().then(cs => { if (Array.isArray(cs)) setContacts(cs); }).catch(() => {});
  }, []);

  // Live caller ID lookup while typing
  useEffect(() => {
    if (number.length >= 7) {
      const match = contacts.find(c => c.phone && c.phone.replace(/\D/g, "").includes(number.replace(/\D/g, "")));
      setMatchedContact(match || null);
    } else {
      setMatchedContact(null);
    }
  }, [number, contacts]);

  const pressKey = (k) => setNumber(n => n + k);
  const backspace = () => setNumber(n => n.slice(0, -1));
  const handleCall = () => { if (number.trim()) onCall?.(number.trim(), matchedContact?.name || ""); };

  const busy = phoneStatus === "active" || phoneStatus === "held" || phoneStatus === "ringing";

  const StatusIcon = ({ direction, status }) => {
    if (status === "missed") return <PhoneMissed className="w-3.5 h-3.5 text-red-400" />;
    if (direction === "inbound") return <PhoneIncoming className="w-3.5 h-3.5 text-green-400" />;
    return <PhoneOutgoing className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 max-w-sm mx-auto">
      {/* Caller ID lookup display */}
      {matchedContact ? (
        <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-center">
          <p className="text-blue-300 font-semibold text-sm">{matchedContact.name}</p>
          <p className="text-blue-400/60 text-xs">{matchedContact.company || "Contact"}</p>
        </div>
      ) : number.length >= 7 ? (
        <div className="w-full bg-white/3 border border-white/5 rounded-xl px-4 py-2 text-center">
          <p className="text-slate-500 text-xs">Unknown caller</p>
        </div>
      ) : null}

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

      {/* Recent calls */}
      {recents.length > 0 && !busy && (
        <div className="w-full mt-2">
          <p className="text-xs text-slate-600 uppercase tracking-wider mb-2 px-1">Recent</p>
          <div className="space-y-1">
            {recents.map(log => {
              const num = log.direction === "inbound" ? log.from_number : log.to_number;
              const name = (log.direction === "inbound" ? log.from_name : log.to_name) || num || "?";
              return (
                <button key={log.id} onClick={() => { setNumber(num); onCall?.(num, name); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group">
                  <StatusIcon direction={log.direction} status={log.status} />
                  <span className="flex-1 text-left text-sm text-slate-300 group-hover:text-white truncate">{name}</span>
                  <span className="text-xs text-slate-600">{fmtTime(log.started_at)}</span>
                  <PhoneCall className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {recents.length === 0 && !busy && (
        <div className="w-full mt-2 text-center">
          <p className="text-xs text-slate-700">No recent calls</p>
        </div>
      )}
    </div>
  );
}
