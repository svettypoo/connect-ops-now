import { useState, useEffect, useRef } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall, Loader2, Trash2, PlayCircle, StopCircle, ChevronDown, ChevronUp, Mic } from "lucide-react";
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
  const [playingId, setPlayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => { loadLogs(); }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getCallLogs(filter === "all" ? null : filter);
      setLogs(Array.isArray(data) ? data : (data?.call_logs || []));
    } catch { setLogs([]); }
    setLoading(false);
  };

  const deleteLog = async (id, e) => {
    e.stopPropagation();
    await api.deleteCallLog(id).catch(() => {});
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const playRecording = (log, e) => {
    e.stopPropagation();
    if (!log.recording_id) return;
    const url = api.streamRecording(log.recording_id);
    if (playingId === log.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audio.crossOrigin = 'use-credentials';
      audio.onended = () => setPlayingId(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingId(log.id);
    }
  };

  const DirIcon = ({ dir, status }) => {
    const cls = "w-4 h-4";
    if (status === "missed") return <PhoneMissed className={cls + " text-red-400"} />;
    if (dir === "inbound") return <PhoneIncoming className={cls + " text-green-400"} />;
    return <PhoneOutgoing className={cls + " text-[#60a5fa]"} />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-4 py-3 border-b border-white/5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id ? "bg-[#3b82f6]/30 text-[#60a5fa]" : "text-slate-500 hover:text-slate-300"}`}>
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
          const isExpanded = expandedId === log.id;
          const hasSummary = log.ai_summary || log.transcript;
          return (
            <div key={log.id} className="border-b border-white/3">
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-all cursor-pointer"
                onClick={() => hasSummary && setExpandedId(isExpanded ? null : log.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  log.status === "missed" ? "bg-red-500/15" : log.direction === "inbound" ? "bg-green-500/15" : "bg-[#3b82f6]/15"
                }`}>
                  <DirIcon dir={log.direction} status={log.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${log.status === "missed" ? "text-red-400" : "text-white"}`}>{name}</p>
                    {log.recording_id && <Mic className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                    {log.ai_summary && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium flex-shrink-0">AI</span>}
                  </div>
                  <p className="text-xs text-slate-500">{number}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-slate-600">{fmtTime(log.started_at || log.created_at)}</span>
                  {log.duration > 0 && <span className="text-[10px] text-slate-600">{fmtDur(log.duration)}</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); onCallBack?.(number, name); }}
                    className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 transition-all" title="Call back">
                    <PhoneCall className="w-3.5 h-3.5 text-green-400" />
                  </button>
                  {log.recording_id && (
                    <button onClick={(e) => playRecording(log, e)}
                      className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 transition-all" title="Play recording">
                      {playingId === log.id ? <StopCircle className="w-3.5 h-3.5 text-blue-400" /> : <PlayCircle className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id, e); }}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-all" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                  {hasSummary && (
                    <div className="text-slate-600">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {log.ai_summary && (
                    <div className="bg-purple-500/10 rounded-xl p-3">
                      <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wide mb-1.5">AI Summary</p>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{log.ai_summary}</p>
                    </div>
                  )}
                  {log.transcript && (
                    <div className="bg-white/5 rounded-xl p-3 max-h-40 overflow-y-auto">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Transcript</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{log.transcript}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
