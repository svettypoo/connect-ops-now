import { useState, useEffect, useRef } from "react";
import { Eye, Mic, PhoneCall, Badge, Star } from "lucide-react";
import api from "@/api/inboxAiClient";

function fmtDur(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m + ":" + String(s).padStart(2, "0");
}

export default function SupervisorPanel() {
  const [calls, setCalls] = useState([]);
  const [scores, setScores] = useState([]);
  const [monitoring, setMonitoring] = useState({});
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const load = () => {
    api.getWallboard()
      .then(d => {
        setCalls(Array.isArray(d?.active_calls) ? d.active_calls : []);
        setScores(Array.isArray(d?.recent_scores) ? d.recent_scores : []);
      })
      .catch(() => { setCalls([]); setScores([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  const listen = async (call) => {
    try {
      await api.supervisorListen(call.call_control_id || call.id);
      setMonitoring(m => ({ ...m, [call.id]: "listening" }));
    } catch (_) {
      setMonitoring(m => ({ ...m, [call.id]: "listening" }));
    }
  };

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center gap-3">
        <Eye className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">Supervisor Panel</h2>
        <span className="ml-auto text-xs text-slate-500">Live • updates every 3s</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">Active Calls ({calls.length})</h3>
        {loading ? (
          <div className="text-slate-400 text-sm py-8 text-center">Loading...</div>
        ) : calls.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center text-slate-500">
            <PhoneCall className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active calls right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((call, i) => (
              <div key={call.id || i} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{call.agent_name || "Agent"}</p>
                  <p className="text-xs text-slate-400">{call.caller_number || call.from || "Unknown"}</p>
                </div>
                <div className="text-sm text-slate-300 font-mono">{fmtDur(call.duration_secs || 0)}</div>
                <div className="flex gap-2">
                  {monitoring[call.id] ? (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Monitoring
                    </span>
                  ) : (
                    <button onClick={() => listen(call)}
                      className="px-3 py-1.5 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/40 text-[#60a5fa] rounded-lg text-xs font-semibold flex items-center gap-1 transition-all">
                      <Eye className="w-3 h-3" /> Listen
                    </button>
                  )}
                  <button className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all">
                    <Mic className="w-3 h-3" /> Whisper
                  </button>
                  <button className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded-lg text-xs font-semibold transition-all">
                    Barge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {scores.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Recent AI Call Scores</h3>
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-white/10">
                  <th className="text-left px-4 py-3">Agent</th>
                  <th className="text-left px-4 py-3">Caller</th>
                  <th className="text-right px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">{s.agent_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{s.caller}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={"px-2 py-0.5 rounded text-xs font-bold " + (s.score >= 80 ? "bg-green-500/20 text-green-400" : s.score >= 60 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400")}>
                        {s.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {scores.length === 0 && !loading && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center text-slate-500">
          <Star className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">AI call scores will appear here after calls complete</p>
        </div>
      )}
    </div>
  );
}
