import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Phone, Clock, AlertCircle, MessageSquare } from "lucide-react";
import api from "@/api/inboxAiClient";

const COLORS = ["#0EB8FF", "#6366F1", "#EF4444", "#10B981"];

export default function AnalyticsDashboard() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getAnalytics(range), api.getAgentAnalytics()])
      .then(([d, a]) => { setData(d || {}); setAgents(Array.isArray(a) ? a : []); })
      .catch(() => { setData({}); setAgents([]); })
      .finally(() => setLoading(false));
  }, [range]);

  const stats = [
    { label: "Total Calls", value: data?.total_calls ?? 0, icon: Phone, color: "#0EB8FF" },
    { label: "Avg Duration", value: data?.avg_duration ? Math.floor(data.avg_duration / 60) + "m " + (data.avg_duration % 60) + "s" : "0s", icon: Clock, color: "#10B981" },
    { label: "Missed Rate", value: (data?.missed_rate ?? 0) + "%", icon: AlertCircle, color: "#EF4444" },
    { label: "SMS Sent", value: data?.sms_sent ?? 0, icon: MessageSquare, color: "#6366F1" },
  ];

  const pieData = data?.breakdown?.length ? data.breakdown : null;
  const hasAnyData = (data?.total_calls ?? 0) > 0;

  const barData = data?.by_day?.length ? data.by_day : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => ({ day: d, calls: 0 }));

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Analytics</h2>
        <div className="flex gap-2">
          {["7d","30d","90d"].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-all " + (range === r ? "bg-[#0684BD] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400">Loading analytics...</div>
      ) : (
        <>
          {!hasAnyData && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300/70 flex items-center gap-2">
              <span>📊</span>
              <span>No calls recorded yet in this period. Make your first call to see analytics populate.</span>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-slate-400 text-xs">{label}</span>
                </div>
                <p className={"text-2xl font-bold " + (!hasAnyData ? "text-slate-600" : "")}>{value}</p>
                {!hasAnyData && <p className="text-xs text-slate-700 mt-1">No data yet</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold mb-4 text-slate-300">Calls by Day</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1e1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Bar dataKey="calls" fill="#0EB8FF" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold mb-4 text-slate-300">Call Breakdown</h3>
              {pieData ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, percent }) => name + " " + Math.round(percent * 100) + "%"} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-slate-600 gap-2">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                  <p className="text-sm">No calls to break down yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold mb-3 text-slate-300">Top Callers</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-white/5">
                  <th className="text-left pb-2">Number</th>
                  <th className="text-left pb-2">Name</th>
                  <th className="text-right pb-2">Calls</th>
                </tr>
              </thead>
              <tbody>
                {(data?.top_callers?.length ? data.top_callers : [{ number: "—", name: "No data yet", count: 0 }]).slice(0,5).map((c, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="py-2 text-slate-300">{c.number}</td>
                    <td className="py-2 text-slate-400">{c.name}</td>
                    <td className="py-2 text-right font-semibold">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {agents.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold mb-3 text-slate-300">Agent Performance</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-white/5">
                    <th className="text-left pb-2">Agent</th>
                    <th className="text-right pb-2">Calls</th>
                    <th className="text-right pb-2">Avg Duration</th>
                    <th className="text-right pb-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-2 text-slate-300">{a.name}</td>
                      <td className="py-2 text-right">{a.calls}</td>
                      <td className="py-2 text-right text-slate-400">{a.avg_duration || "—"}</td>
                      <td className="py-2 text-right">
                        <span className={"px-2 py-0.5 rounded text-xs font-semibold " + ((a.score || 0) >= 80 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                          {a.score ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
