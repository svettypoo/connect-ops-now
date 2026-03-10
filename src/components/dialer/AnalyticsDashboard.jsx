import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Phone, PhoneMissed, MessageSquare, Clock, TrendingUp, Users, Star } from 'lucide-react';

const RANGES = ['7d','30d','90d'];
const COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = { blue: 'bg-blue-500/20 text-blue-400', red: 'bg-red-500/20 text-red-400', green: 'bg-green-500/20 text-green-400', yellow: 'bg-yellow-500/20 text-yellow-400' };
  return (
    <div className="bg-[#1e1e3a] rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color]}`}><Icon size={22}/></div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getCallAnalytics(range),
      api.getAgentAnalytics(),
      api.getCallScores(),
    ]).then(([d, a, s]) => {
      setData(d); setAgents(a); setScores(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [range]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading analytics…</div>;
  if (!data) return null;

  const pieData = [
    { name: 'Inbound', value: data.inbound || 0 },
    { name: 'Outbound', value: data.outbound || 0 },
    { name: 'Missed', value: data.missed || 0 },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${range===r ? 'bg-blue-600 text-white' : 'bg-[#1e1e3a] text-gray-400 hover:bg-[#2a2a4a]'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Phone} label="Total Calls" value={data.total} color="blue"/>
        <StatCard icon={PhoneMissed} label="Missed" value={data.missed} color="red"/>
        <StatCard icon={Clock} label="Avg Duration" value={data.avgDuration + 's'} color="yellow"/>
        <StatCard icon={MessageSquare} label="SMS Sent" value={data.smsSent} color="green"/>
      </div>

      {/* Daily Chart */}
      <div className="bg-[#1e1e3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Daily Call Volume</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.daily}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a"/>
            <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={d => d.slice(5)}/>
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }}/>
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}/>
            <Area type="monotone" dataKey="calls" stroke="#3b82f6" fill="url(#cg)" name="Calls"/>
            <Area type="monotone" dataKey="missed" stroke="#ef4444" fill="url(#mg)" name="Missed"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-[#1e1e3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Call Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]}/>)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Callers */}
        <div className="bg-[#1e1e3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><TrendingUp size={14}/> Top Callers</h3>
          <div className="space-y-2">
            {(data.topCallers || []).length === 0 && <p className="text-gray-500 text-sm">No data yet</p>}
            {(data.topCallers || []).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{c.name}</span>
                <span className="text-blue-400 font-semibold">{c.calls} calls</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="bg-[#1e1e3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Users size={14}/> Agent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 border-b border-[#2a2a4a]">
              <th className="text-left py-2">Agent</th><th className="text-right py-2">Calls</th>
              <th className="text-right py-2">Avg Duration</th><th className="text-right py-2">Missed</th>
              <th className="text-right py-2">SMS</th><th className="text-right py-2">Status</th>
            </tr></thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id} className="border-b border-[#2a2a4a]/50">
                  <td className="py-2 text-white">{a.name}</td>
                  <td className="py-2 text-right text-gray-300">{a.calls}</td>
                  <td className="py-2 text-right text-gray-300">{a.avgDuration}s</td>
                  <td className="py-2 text-right text-red-400">{a.missed}</td>
                  <td className="py-2 text-right text-gray-300">{a.sms}</td>
                  <td className="py-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status==='available'?'bg-green-500/20 text-green-400':'bg-gray-500/20 text-gray-400'}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Call Scores */}
      {scores.length > 0 && (
        <div className="bg-[#1e1e3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Star size={14}/> AI Call Scores</h3>
          <div className="space-y-3">
            {scores.slice(0,5).map(s => (
              <div key={s.id} className="bg-[#2a2a4a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{s.created_at?.slice(0,16)}</span>
                  <span className={`text-lg font-bold ${s.score>=80?'text-green-400':s.score>=60?'text-yellow-400':'text-red-400'}`}>{s.score}/100</span>
                </div>
                <p className="text-xs text-gray-400">{s.summary}</p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  {Object.entries(s.breakdown||{}).map(([k,v]) => (
                    <span key={k} className="text-xs text-gray-500">{k}: <span className="text-gray-300">{v}/10</span></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
