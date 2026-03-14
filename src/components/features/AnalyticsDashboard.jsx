import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from "recharts";
import { Phone, Clock, AlertCircle, MessageSquare, Voicemail, Timer, Download, TrendingUp } from "lucide-react";
import api from "@/api/inboxAiClient";

const COLORS = ["#60a5fa", "#6366F1", "#EF4444", "#10B981"];

function fmtSecs(secs) {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? m + "m " + s + "s" : s + "s";
}

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
    { label: "Total Calls", value: data?.total ?? 0, icon: Phone, color: "#60a5fa" },
    { label: "Avg Duration", value: fmtSecs(data?.avgDuration || 0), icon: Clock, color: "#10B981" },
    { label: "Missed Rate", value: data?.total > 0 ? Math.round((data?.missed || 0) / data.total * 100) + "%" : "0%", icon: AlertCircle, color: "#EF4444" },
    { label: "SMS Sent", value: data?.smsSent ?? 0, icon: MessageSquare, color: "#6366F1" },
    { label: "Avg Response", value: fmtSecs(data?.avgResponse || 0), icon: Timer, color: "#f59e0b" },
    { label: "Voicemails", value: data?.voicemails ?? 0, icon: Voicemail, color: "#ec4899" },
  ];

  const hasAnyData = (data?.total ?? 0) > 0;

  // Daily chart data
  const dailyData = data?.daily?.length
    ? data.daily.map(d => ({ ...d, day: d.date?.slice(5) || d.day }))
    : [];

  // Direction breakdown for pie
  const pieData = [];
  if (data?.inbound > 0) pieData.push({ name: 'Inbound', value: data.inbound });
  if (data?.outbound > 0) pieData.push({ name: 'Outbound', value: data.outbound });
  if (data?.missed > 0) pieData.push({ name: 'Missed', value: data.missed });

  // Peak hours data
  const hourlyData = data?.hourly || [];
  const peakHour = hourlyData.reduce((max, h) => h.calls > (max?.calls || 0) ? h : max, null);

  const exportCsv = () => {
    if (!data?.daily?.length) return;
    const header = 'Date,Calls,Missed\n';
    const rows = data.daily.map(d => `${d.date},${d.calls},${d.missed || 0}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-[#60a5fa]" />
          <h2 className="text-xl font-bold">Analytics</h2>
        </div>
        <div className="flex gap-2 items-center">
          {hasAnyData && (
            <button onClick={exportCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-400 hover:bg-white/10 transition-all flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
          )}
          {["7d","30d","90d"].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-all " + (range === r ? "bg-[#3b82f6] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
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
              <Phone className="w-4 h-4" />
              <span>No calls recorded yet in this period. Make your first call to see analytics populate.</span>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-slate-400 text-xs">{label}</span>
                </div>
                <p className={"text-2xl font-bold " + (!hasAnyData ? "text-slate-600" : "")}>{value}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily calls chart */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold mb-4 text-slate-300">Call Volume</h3>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1e1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="calls" fill="#60a5fa" radius={[4,4,0,0]} name="Calls" />
                    <Bar dataKey="missed" fill="#ef4444" radius={[4,4,0,0]} name="Missed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">No data</div>
              )}
            </div>

            {/* Direction breakdown */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold mb-4 text-slate-300">Call Breakdown</h3>
              {pieData.length > 0 ? (
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
                  <Phone className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No calls to break down yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Peak Hours Heatmap */}
          {hourlyData.length > 0 && hasAnyData && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300">Peak Hours</h3>
                {peakHour && peakHour.calls > 0 && (
                  <span className="text-xs text-slate-500">
                    Busiest: {peakHour.hour === 0 ? '12 AM' : peakHour.hour <= 12 ? peakHour.hour + (peakHour.hour === 12 ? ' PM' : ' AM') : (peakHour.hour - 12) + ' PM'}
                    ({peakHour.calls} calls)
                  </span>
                )}
              </div>
              <div className="flex gap-1 items-end h-16">
                {hourlyData.map((h, i) => {
                  const maxCalls = Math.max(...hourlyData.map(x => x.calls), 1);
                  const pct = h.calls / maxCalls;
                  const label = i === 0 ? '12a' : i < 12 ? i + 'a' : i === 12 ? '12p' : (i - 12) + 'p';
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${label}: ${h.calls} calls`}>
                      <div className="w-full rounded-t"
                        style={{
                          height: Math.max(4, pct * 48) + 'px',
                          background: pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f59e0b' : pct > 0 ? '#60a5fa' : 'rgba(255,255,255,0.05)',
                          transition: 'height 0.3s',
                        }} />
                      {i % 3 === 0 && <span className="text-[8px] text-slate-600">{label}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Callers */}
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
                {(data?.topCallers?.length ? data.topCallers : [{ number: "—", name: "No data yet", calls: 0 }]).slice(0,5).map((c, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="py-2 text-slate-300">{c.number}</td>
                    <td className="py-2 text-slate-400">{c.name}</td>
                    <td className="py-2 text-right font-semibold">{c.calls || c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Agent Performance */}
          {agents.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold mb-3 text-slate-300">Agent Performance</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-white/5">
                    <th className="text-left pb-2">Agent</th>
                    <th className="text-right pb-2">Calls</th>
                    <th className="text-right pb-2">Avg Duration</th>
                    <th className="text-right pb-2">Missed</th>
                    <th className="text-right pb-2">SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-2 text-slate-300">{a.name}</td>
                      <td className="py-2 text-right">{a.calls}</td>
                      <td className="py-2 text-right text-slate-400">{fmtSecs(a.avgDuration || a.avg_duration || 0)}</td>
                      <td className="py-2 text-right">
                        <span className={a.missed > 0 ? "text-red-400" : "text-slate-600"}>{a.missed || 0}</span>
                      </td>
                      <td className="py-2 text-right text-slate-400">{a.sms || 0}</td>
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
