import { useState, useEffect, useRef } from "react";
import { Eye, Mic, PhoneCall, Star, AlertTriangle, Users, PhoneOff, Clock, MessageSquare, Send } from "lucide-react";
import api from "@/api/inboxAiClient";

function fmtDur(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m + ":" + String(s).padStart(2, "0");
}

const MODE_CONFIG = {
  listening: { label: "Listening", color: "blue", icon: Eye },
  whisper: { label: "Whispering", color: "purple", icon: Mic },
  barge: { label: "Barged In", color: "orange", icon: PhoneCall },
};

export default function SupervisorPanel() {
  const [calls, setCalls] = useState([]);
  const [scores, setScores] = useState([]);
  const [monitoring, setMonitoring] = useState({});
  const [loading, setLoading] = useState(true);
  const [coachingNotes, setCoachingNotes] = useState({});
  const [noteInputs, setNoteInputs] = useState({});
  const [todayStats, setTodayStats] = useState({ total: 0, abandoned: 0, queueDepth: 0 });
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const [tick, setTick] = useState(0);

  const load = () => {
    api.getWallboard()
      .then(d => {
        setCalls(Array.isArray(d?.active_calls) ? d.active_calls : []);
        setScores(Array.isArray(d?.recent_scores) ? d.recent_scores : []);
        setTodayStats({
          total: d?.today_total || 0,
          abandoned: d?.today_abandoned || 0,
          queueDepth: d?.queue_depth || 0,
        });
      })
      .catch(() => { setCalls([]); setScores([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(tickRef.current); };
  }, []);

  const listen = async (call) => {
    try {
      await api.supervisorListen(call.call_control_id || call.id);
    } catch (_) {}
    setMonitoring(m => ({ ...m, [call.id]: "listening" }));
  };

  const whisper = async (call) => {
    try {
      await api.supervisorWhisper?.(call.call_control_id || call.id);
    } catch (_) {}
    setMonitoring(m => ({ ...m, [call.id]: "whisper" }));
  };

  const barge = async (call) => {
    try {
      await api.supervisorBarge?.(call.call_control_id || call.id);
    } catch (_) {}
    setMonitoring(m => ({ ...m, [call.id]: "barge" }));
  };

  const stopMonitoring = (callId) => {
    setMonitoring(m => { const n = { ...m }; delete n[callId]; return n; });
  };

  const sendNote = (callId) => {
    const text = noteInputs[callId]?.trim();
    if (!text) return;
    setCoachingNotes(prev => ({
      ...prev,
      [callId]: [...(prev[callId] || []), { text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
    }));
    setNoteInputs(prev => ({ ...prev, [callId]: '' }));
  };

  // Derived stats
  const activeCalls = calls.length;
  const abandonRate = todayStats.total > 0 ? Math.round((todayStats.abandoned / todayStats.total) * 100) : 0;
  const queueWarning = todayStats.queueDepth >= 3;

  // Agent status from active calls
  const agentMap = {};
  calls.forEach(c => {
    const name = c.agent_name || "Unknown Agent";
    if (!agentMap[name]) agentMap[name] = { name, calls: 0, status: 'on_call' };
    agentMap[name].calls++;
  });
  const agents = Object.values(agentMap);

  const stats = [
    { label: "Active Calls", value: activeCalls, icon: PhoneCall, color: "#22c55e", pulse: activeCalls > 0 },
    { label: "Queue Depth", value: todayStats.queueDepth, icon: Users, color: queueWarning ? "#ef4444" : "#60a5fa" },
    { label: "Abandoned Today", value: todayStats.abandoned, icon: PhoneOff, color: "#ef4444" },
    { label: "Total Today", value: todayStats.total, icon: Clock, color: "#6366F1" },
  ];

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center gap-3">
        <Eye className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">Supervisor Panel</h2>
        <span className="ml-auto text-xs text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live • updates every 3s
        </span>
      </div>

      {/* Queue Warning Banner */}
      {queueWarning && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">High Queue Alert</p>
            <p className="text-xs text-red-400/70">{todayStats.queueDepth} callers waiting — consider pulling in additional agents</p>
          </div>
        </div>
      )}

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color, pulse }) => (
          <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-slate-400 text-xs">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {pulse && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </div>
            {label === "Abandoned Today" && todayStats.total > 0 && (
              <p className={"text-[10px] mt-1 " + (abandonRate > 10 ? "text-red-400" : "text-slate-500")}>
                {abandonRate}% abandon rate
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Agent Status Overview */}
      {agents.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Agent Status</h3>
          <div className="flex flex-wrap gap-2">
            {agents.map(a => (
              <div key={a.name} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold">
                  {a.calls} call{a.calls > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Calls */}
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
            {calls.map((call, i) => {
              const mode = monitoring[call.id];
              const modeConf = mode ? MODE_CONFIG[mode] : null;
              const ModeIcon = modeConf?.icon;
              const notes = coachingNotes[call.id] || [];
              return (
                <div key={call.id || i} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{call.agent_name || "Agent"}</p>
                      <p className="text-xs text-slate-400">{call.caller_number || call.from || "Unknown"}</p>
                      {call.direction && (
                        <span className={"text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block font-semibold " +
                          (call.direction === 'inbound' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400')}>
                          {call.direction}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-300 font-mono tabular-nums">
                      {fmtDur((call.duration_secs || 0) + tick * 0)}
                    </div>
                    <div className="flex gap-2 items-center">
                      {modeConf ? (
                        <button onClick={() => stopMonitoring(call.id)}
                          className={`px-2.5 py-1.5 bg-${modeConf.color}-500/20 text-${modeConf.color}-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:opacity-70`}
                          style={{ background: `var(--${modeConf.color}, rgba(96,165,250,0.2))` }}
                          title="Click to stop">
                          <ModeIcon className="w-3 h-3" /> {modeConf.label}
                        </button>
                      ) : (
                        <>
                          <button onClick={() => listen(call)}
                            className="px-3 py-1.5 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/40 text-[#60a5fa] rounded-lg text-xs font-semibold flex items-center gap-1 transition-all">
                            <Eye className="w-3 h-3" /> Listen
                          </button>
                          <button onClick={() => whisper(call)}
                            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all">
                            <Mic className="w-3 h-3" /> Whisper
                          </button>
                          <button onClick={() => barge(call)}
                            className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded-lg text-xs font-semibold transition-all">
                            Barge
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Coaching Notes Section */}
                  {mode && (
                    <div className="border-t border-white/5 px-4 py-3 bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Coaching Notes</span>
                      </div>
                      {notes.length > 0 && (
                        <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                          {notes.map((n, ni) => (
                            <div key={ni} className="flex items-start gap-2 text-xs">
                              <span className="text-slate-600 text-[10px] flex-shrink-0">{n.time}</span>
                              <span className="text-slate-300">{n.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteInputs[call.id] || ''}
                          onChange={e => setNoteInputs(prev => ({ ...prev, [call.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && sendNote(call.id)}
                          placeholder="Add coaching note..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-[#3b82f6]/50"
                        />
                        <button onClick={() => sendNote(call.id)}
                          className="px-2.5 py-1.5 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 rounded-lg transition-all">
                          <Send className="w-3 h-3 text-[#60a5fa]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Call Scores */}
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
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{s.notes || "—"}</td>
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
