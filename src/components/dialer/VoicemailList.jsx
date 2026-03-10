import { useState, useEffect } from "react";
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
            className={`flex items-start gap-3 px-4 py-4 border-b border-white/3 transition-all cursor-pointer ${!vm.is_read ? "bg-white/3 hover:bg-white/6" : "hover:bg-white/4"}`}>
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
              {vm.transcript && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{vm.transcript}</p>}
              {vm.ai_summary && !vm.transcript && <p className="text-xs text-slate-400 line-clamp-2 mb-2 italic">{vm.ai_summary}</p>}
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); playVm(vm); }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    playing === vm.id ? "bg-[#0684BD]/40 text-[#0EB8FF]" : "bg-white/5 hover:bg-white/10 text-slate-300"
                  }`}>
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
