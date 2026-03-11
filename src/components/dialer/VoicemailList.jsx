import { useState, useEffect, useRef } from "react";
import { Voicemail, Play, Pause, PhoneCall, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
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

function Waveform({ active }) {
  const heights = [4,7,10,14,10,7,12,9,6,11,8,5,10,7,4,9,12,8,6,10];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'2px', height:'20px' }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width:'3px', borderRadius:'2px',
          background: active ? '#0EB8FF' : '#3A3D45',
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
  const audioRef = useRef(null);

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
        {vms.map(vm => {
          const isExpanded = expandedId === vm.id;
          const isPlaying = playing === vm.id;
          return (
            <div key={vm.id} className="border-b border-white/3">
              <div
                onClick={() => { markRead(vm.id); hasSummary(vm) && setExpandedId(isExpanded ? null : vm.id); }}
                className={`flex items-start gap-3 px-4 py-4 cursor-pointer transition-all ${!vm.is_read ? "bg-white/3 hover:bg-white/6" : "hover:bg-white/4"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!vm.is_read ? "bg-red-500/20" : "bg-white/5"}`}>
                  <Voicemail className={`w-4 h-4 ${!vm.is_read ? "text-red-400" : "text-slate-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${!vm.is_read ? "text-white" : "text-slate-300"}`}>
                      {vm.contact_name || vm.from_number || "Unknown"}
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

                  {/* AI summary preview (always shown if available) */}
                  {vm.ai_summary && (
                    <p className="text-xs text-purple-300/80 line-clamp-2 mb-2 italic">{vm.ai_summary}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button onClick={(e) => playVm(vm, e)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        isPlaying ? "bg-[#0684BD]/40 text-[#0EB8FF]" : "bg-white/5 hover:bg-white/10 text-slate-300"
                      }`}>
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {isPlaying ? "Pause" : fmtDur(vm.duration) || "Play"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onCallBack?.(vm.from_number, vm.contact_name); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium transition-all">
                      <PhoneCall className="w-3 h-3" /> Call back
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
