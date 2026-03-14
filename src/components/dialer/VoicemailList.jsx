import { useState, useEffect, useRef } from "react";
import { Voicemail, Play, Pause, PhoneCall, Loader2, CheckCircle, ChevronDown, ChevronUp, Trash2, Download, Search, X } from "lucide-react";
import api from "@/api/inboxAiClient";

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

function Waveform({ active }) {
  const heights = [4,7,10,14,10,7,12,9,6,11,8,5,10,7,4,9,12,8,6,10];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'20px' }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width:'3px', borderRadius:'2px',
          background: active ? '#60a5fa' : '#243352',
          height: active ? h + 'px' : '4px',
          animation: active ? `wave ${0.5 + i * 0.06}s ease-in-out infinite alternate` : 'none',
          transition: 'height 0.3s ease',
        }} />
      ))}
      <style>{`@keyframes wave { from { transform: scaleY(0.4); opacity:0.6; } to { transform: scaleY(1.2); opacity:1; } }`}</style>
    </div>
  );
}

export default function VoicemailList({ onCallBack }) {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const audioRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    api.getVoicemails()
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.voicemails || []);
        setVms(list);
      })
      .catch(() => setVms([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);

  const markRead = (id) => {
    api.markVoicemailRead(id).catch(() => {});
    setVms(prev => prev.map(v => v.id === id ? { ...v, is_read: true } : v));
  };

  const deleteVm = async (id, e) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.deleteVoicemail(id);
      if (playing === id) { audioRef.current?.pause(); setPlaying(null); }
      setVms(prev => prev.filter(v => v.id !== id));
    } catch {}
    setDeleting(null);
  };

  const downloadVm = (vm, e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = api.getVoicemailAudio(vm.id);
    a.download = `voicemail-${vm.from_number || 'unknown'}-${new Date(vm.created_at).toISOString().slice(0,10)}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const playVm = (vm, e) => {
    e?.stopPropagation();
    if (playing === vm.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    markRead(vm.id);
    audioRef.current?.pause();
    const audio = new Audio(api.getVoicemailAudio(vm.id));
    audio.play().catch(() => {});
    audio.addEventListener("ended", () => setPlaying(null));
    audioRef.current = audio;
    setPlaying(vm.id);
  };

  const unreadCount = vms.filter(v => !v.is_read).length;
  const hasSummary = (vm) => vm.transcript || vm.ai_summary;

  // Filter by search
  const filteredVms = vms.filter(vm => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (vm.contact_name || vm.from_name || "").toLowerCase();
    const number = (vm.from_number || "").toLowerCase();
    const summary = (vm.ai_summary || "").toLowerCase();
    return name.includes(q) || number.includes(q) || summary.includes(q);
  });

  // Group by date
  const grouped = [];
  let currentGroup = null;
  filteredVms.forEach(vm => {
    const group = getDateGroup(vm.created_at);
    if (group !== currentGroup) {
      currentGroup = group;
      grouped.push({ type: 'header', label: group });
    }
    grouped.push({ type: 'vm', data: vm });
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Voicemail className="w-4 h-4 text-[#60a5fa]" />
        <span className="text-sm font-medium text-white">Voicemail</span>
        {vms.length > 0 && <span className="text-[10px] text-slate-600">{vms.length} total</span>}
        {unreadCount > 0 && (
          <span className="ml-auto w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">{unreadCount}</span>
        )}
        <button onClick={() => setShowSearch(!showSearch)}
          className={`${unreadCount > 0 ? '' : 'ml-auto'} p-1.5 rounded-lg transition-all ${showSearch ? "bg-[#3b82f6]/20 text-[#60a5fa]" : "text-slate-600 hover:text-slate-400"}`}
          title="Search voicemails">
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, number, or summary..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            className="p-1 rounded hover:bg-white/10 transition-all">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>}
        {!loading && filteredVms.length === 0 && (
          <div className="text-center py-12">
            <Voicemail className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">{searchQuery ? "No matching voicemails" : "No voicemails"}</p>
          </div>
        )}
        {grouped.map((item, idx) => {
          if (item.type === 'header') {
            return (
              <div key={'h-' + item.label + idx} className="px-4 py-2 bg-white/[0.02]">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
              </div>
            );
          }
          const vm = item.data;
          const isExpanded = expandedId === vm.id;
          const isPlaying = playing === vm.id;
          const callerName = vm.contact_name || vm.from_name || vm.from_number || "Unknown";
          const initials = callerName === "Unknown" || !callerName ? "?" : callerName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
          const avatarHue = (callerName || "U").charCodeAt(0) * 7 % 360;
          return (
            <div key={vm.id} className="border-b border-white/3">
              <div
                onClick={() => { markRead(vm.id); hasSummary(vm) && setExpandedId(isExpanded ? null : vm.id); }}
                className={`flex items-start gap-3 px-4 py-4 cursor-pointer transition-all ${!vm.is_read ? "bg-white/3 hover:bg-white/6" : "hover:bg-white/4"}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: `hsl(${avatarHue}, 50%, 35%)` }}>
                    {initials}
                  </div>
                  {!vm.is_read && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#0f1729]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${!vm.is_read ? "text-white" : "text-slate-300"}`}>
                      {callerName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">{fmtTime(vm.created_at)}</span>
                      {vm.is_read && <CheckCircle className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                  </div>

                  {/* Waveform + duration */}
                  <div className="flex items-center gap-3 mb-2">
                    <Waveform active={isPlaying} />
                    {vm.duration > 0 && <span className="text-[10px] text-slate-600">{fmtDur(vm.duration)}</span>}
                    {vm.ai_summary && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">AI</span>}
                  </div>

                  {/* AI summary preview */}
                  {vm.ai_summary && (
                    <p className="text-xs text-purple-300/80 line-clamp-2 mb-2 italic">{vm.ai_summary}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button onClick={(e) => playVm(vm, e)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        isPlaying ? "bg-[#3b82f6]/40 text-[#60a5fa]" : "bg-white/5 hover:bg-white/10 text-slate-300"
                      }`}>
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {isPlaying ? "Pause" : fmtDur(vm.duration) || "Play"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onCallBack?.(vm.from_number, vm.contact_name || vm.from_name); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium transition-all">
                      <PhoneCall className="w-3 h-3" /> Call back
                    </button>
                    <button onClick={(e) => downloadVm(vm, e)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-all" title="Download">
                      <Download className="w-3 h-3 text-blue-400" />
                    </button>
                    <button onClick={(e) => deleteVm(vm.id, e)}
                      disabled={deleting === vm.id}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all" title="Delete voicemail">
                      <Trash2 className={`w-3 h-3 text-red-400 ${deleting === vm.id ? 'opacity-50' : ''}`} />
                    </button>
                    {hasSummary(vm) && (
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : vm.id); }}
                        className="ml-auto text-slate-600">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {vm.transcript && (
                    <div className="bg-white/5 rounded-xl p-3 max-h-36 overflow-y-auto">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Transcript</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{vm.transcript}</p>
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
