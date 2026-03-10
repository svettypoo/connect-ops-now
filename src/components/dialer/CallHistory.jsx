import { useState, useEffect } from "react";
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id ? "bg-[#0684BD]/30 text-[#0EB8FF]" : "text-slate-500 hover:text-slate-300"}`}>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                log.status === "missed" ? "bg-red-500/15" : log.direction === "inbound" ? "bg-green-500/15" : "bg-[#0684BD]/15"
              }`}>
                <Icon dir={log.direction} status={log.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${log.status === "missed" ? "text-red-400" : "text-white"}`}>{name}</p>
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
