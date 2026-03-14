import { useState, useEffect, useRef } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall, Loader2, Trash2, PlayCircle, StopCircle, ChevronDown, ChevronUp, Mic, Download, Share2, Search, X, BarChart3 } from "lucide-react";
import api from "@/api/inboxAiClient";

// Format raw transcript into readable paragraphs
function formatTranscript(text) {
  if (!text) return [];
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/\b(hello|hi|hey|okay|all right|so where|so can|you're)\b/gi, '\n$1')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(' '));
  }
  return paragraphs;
}

function fmtTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.round(diff/60000) + "m ago";
  if (diff < 86400000) return Math.round(diff/3600000) + "h ago";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " " + d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
}
function fmtDur(secs) {
  if (!secs) return "";
  const m = Math.floor(secs/60), s = secs%60;
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

// Date grouping helper
function getDateGroup(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= weekAgo) return "This Week";
  return "Older";
}

// Contact initials
function getInitials(name) {
  if (!name || name === "Unknown") return "?";
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const audioRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => { loadLogs(); }, [filter]);
  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);

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

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playProgress, setPlayProgress] = useState(0);
  const [playCurrentTime, setPlayCurrentTime] = useState(0);
  const [playDuration, setPlayDuration] = useState(0);
  const progressTimerRef = useRef(null);

  const startProgressTracking = () => {
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      const a = audioRef.current;
      if (a && a.duration && isFinite(a.duration)) {
        setPlayProgress(a.currentTime / a.duration);
        setPlayCurrentTime(a.currentTime);
        setPlayDuration(a.duration);
      }
    }, 200);
  };

  const stopProgressTracking = () => {
    clearInterval(progressTimerRef.current);
    setPlayProgress(0);
    setPlayCurrentTime(0);
    setPlayDuration(0);
  };

  const playRecording = (log, e) => {
    e.stopPropagation();
    if (!log.recording_id) return;
    const url = api.streamRecording(log.recording_id);
    if (playingId === log.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      stopProgressTracking();
    } else {
      if (audioRef.current) audioRef.current.pause();
      stopProgressTracking();
      const audio = new Audio(url);
      audio.crossOrigin = 'use-credentials';
      audio.playbackRate = playbackSpeed;
      audio.onended = () => { setPlayingId(null); stopProgressTracking(); };
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingId(log.id);
      startProgressTracking();
    }
  };

  const seekRecording = (e) => {
    e.stopPropagation();
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
      setPlayProgress(pct);
    }
  };

  const fmtPlayTime = (secs) => {
    if (!secs || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const downloadRecording = (log, e) => {
    e.stopPropagation();
    if (!log.recording_id) return;
    const a = document.createElement('a');
    a.href = api.streamRecording(log.recording_id);
    a.download = `recording-${log.recording_id}.webm`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareRecording = async (log, e) => {
    e.stopPropagation();
    if (!log.recording_id) return;
    const url = api.streamRecording(log.recording_id);
    if (navigator.share) {
      try { await navigator.share({ title: 'Call Recording', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const DirIcon = ({ dir, status }) => {
    const cls = "w-4 h-4";
    if (status === "missed") return <PhoneMissed className={cls + " text-red-400"} />;
    if (dir === "inbound") return <PhoneIncoming className={cls + " text-green-400"} />;
    return <PhoneOutgoing className={cls + " text-[#60a5fa]"} />;
  };

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (log.direction === "inbound" ? log.from_name : log.to_name) || "";
    const number = (log.direction === "inbound" ? log.from_number : log.to_number) || "";
    return name.toLowerCase().includes(q) || number.includes(q);
  });

  // Group logs by date
  const groupedLogs = [];
  let currentGroup = null;
  filteredLogs.forEach(log => {
    const group = getDateGroup(log.started_at || log.created_at);
    if (group !== currentGroup) {
      currentGroup = group;
      groupedLogs.push({ type: 'header', label: group });
    }
    groupedLogs.push({ type: 'log', data: log });
  });

  // Quick stats
  const totalCalls = logs.length;
  const missedCalls = logs.filter(l => l.status === "missed").length;
  const avgDuration = totalCalls > 0 ? Math.round(logs.reduce((s, l) => s + (l.duration || 0), 0) / totalCalls) : 0;
  const withRecording = logs.filter(l => l.recording_id).length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats strip */}
      {totalCalls > 0 && !showSearch && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500">{totalCalls} calls</span>
          </div>
          {missedCalls > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-red-400/80">{missedCalls} missed</span>
            </div>
          )}
          {avgDuration > 0 && (
            <span className="text-[10px] text-slate-600">avg {fmtDur(avgDuration)}</span>
          )}
          {withRecording > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Mic className="w-2.5 h-2.5 text-slate-600" />
              <span className="text-[10px] text-slate-600">{withRecording}</span>
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or number..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            className="p-1 rounded hover:bg-white/10 transition-all">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      )}

      {/* Filter tabs + search toggle */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-white/5">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id ? "bg-[#3b82f6]/30 text-[#60a5fa]" : "text-slate-500 hover:text-slate-300"}`}>
            {f.label}
            {f.id === "missed" && missedCalls > 0 && (
              <span className="ml-1 px-1 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px]">{missedCalls}</span>
            )}
          </button>
        ))}
        <button onClick={() => setShowSearch(!showSearch)}
          className={`ml-auto p-1.5 rounded-lg transition-all ${showSearch ? "bg-[#3b82f6]/20 text-[#60a5fa]" : "text-slate-600 hover:text-slate-400"}`}
          title="Search calls">
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>}
        {!loading && filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <PhoneCall className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">{searchQuery ? "No matching calls" : "No calls"}</p>
            {searchQuery && <p className="text-slate-700 text-xs mt-1">Try a different search term</p>}
          </div>
        )}
        {groupedLogs.map((item, idx) => {
          if (item.type === 'header') {
            return (
              <div key={'h-' + item.label} className="px-4 py-2 bg-white/[0.02]">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
              </div>
            );
          }
          const log = item.data;
          const name = (log.direction === "inbound" ? log.from_name : log.to_name) || (log.direction === "inbound" ? log.from_number : log.to_number) || "Unknown";
          const number = log.direction === "inbound" ? log.from_number : log.to_number;
          const isExpanded = expandedId === log.id;
          const hasSummary = log.ai_summary || log.transcript;
          const initials = getInitials(name);
          const avatarHue = (name || "U").charCodeAt(0) * 7 % 360;
          return (
            <div key={log.id} className="border-b border-white/3">
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-all cursor-pointer"
                onClick={() => hasSummary && setExpandedId(isExpanded ? null : log.id)}
              >
                {/* Avatar with direction indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: `hsl(${avatarHue}, 50%, 35%)` }}>
                    {initials}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                    log.status === "missed" ? "bg-red-500/30" : log.direction === "inbound" ? "bg-green-500/30" : "bg-[#3b82f6]/30"
                  }`}>
                    <DirIcon dir={log.direction} status={log.status} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${log.status === "missed" ? "text-red-400" : "text-white"}`}>{name}</p>
                    {log.recording_id && <Mic className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                    {log.ai_summary && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium flex-shrink-0">AI</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">{number}</p>
                    {log.duration > 0 && <span className="text-[10px] text-slate-600">{fmtDur(log.duration)}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-slate-600">{fmtTime(log.started_at || log.created_at)}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); onCallBack?.(number, name); }}
                    className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 transition-all" title="Call back">
                    <PhoneCall className="w-3.5 h-3.5 text-green-400" />
                  </button>
                  {log.recording_id && (
                    <>
                      <button onClick={(e) => playRecording(log, e)}
                        className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 transition-all" title={playingId === log.id ? "Stop" : "Play recording"}>
                        {playingId === log.id ? <StopCircle className="w-3.5 h-3.5 text-blue-400" /> : <PlayCircle className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                      {playingId === log.id && (
                        <button onClick={cycleSpeed}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Playback speed">
                          {playbackSpeed}x
                        </button>
                      )}
                      <button onClick={(e) => downloadRecording(log, e)}
                        className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-all" title="Download">
                        <Download className="w-3.5 h-3.5 text-green-400" />
                      </button>
                      <button onClick={(e) => shareRecording(log, e)}
                        className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-all" title="Share / Copy link">
                        <Share2 className="w-3.5 h-3.5 text-purple-400" />
                      </button>
                    </>
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
              {/* Progress bar when playing this recording */}
              {playingId === log.id && log.recording_id && (
                <div className="flex items-center gap-2 px-4 pb-2" onClick={e => e.stopPropagation()}>
                  <span className="text-[9px] text-slate-500 min-w-[28px] tabular-nums">{fmtPlayTime(playCurrentTime)}</span>
                  <div
                    onClick={seekRecording}
                    className="flex-1 h-1.5 bg-white/8 rounded-full cursor-pointer relative overflow-hidden"
                    title="Click to seek"
                  >
                    <div className="absolute top-0 left-0 h-full rounded-full" style={{
                      width: (playProgress * 100) + '%',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                      transition: 'width 0.15s linear',
                    }} />
                    <div className="absolute rounded-full bg-[#60a5fa]" style={{
                      top: '-1.5px',
                      left: `calc(${playProgress * 100}% - 4px)`,
                      width: '8px', height: '8px',
                      boxShadow: '0 0 4px rgba(96,165,250,0.5)',
                      transition: 'left 0.15s linear',
                    }} />
                  </div>
                  <span className="text-[9px] text-slate-500 min-w-[28px] text-right tabular-nums">{fmtPlayTime(playDuration)}</span>
                </div>
              )}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {log.ai_summary && (
                    <div className="bg-purple-500/10 rounded-xl p-3">
                      <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wide mb-1.5">AI Summary</p>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{log.ai_summary}</p>
                    </div>
                  )}
                  {log.transcript && (
                    <div className="bg-white/5 rounded-xl p-3 max-h-60 overflow-y-auto">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Transcript</p>
                      {formatTranscript(log.transcript).map((para, i) => (
                        <p key={i} className="text-xs text-slate-400 leading-relaxed" style={{ marginTop: i > 0 ? '8px' : 0 }}>{para}</p>
                      ))}
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
