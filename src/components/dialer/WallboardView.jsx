import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Phone, PhoneMissed, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react';

function formatDur(secs) {
  const m = Math.floor(secs/60), s = secs%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function MetricCard({ icon: Icon, label, value, color }) {
  const c = { blue:'text-blue-400 bg-blue-500/20', red:'text-red-400 bg-red-500/20', green:'text-green-400 bg-green-500/20', yellow:'text-yellow-400 bg-yellow-500/20' };
  return (
    <div className="bg-[#1e1e3a] rounded-xl p-5 flex flex-col items-center gap-2">
      <div className={`p-3 rounded-xl ${c[color]}`}><Icon size={24}/></div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 text-center">{label}</div>
    </div>
  );
}

export default function WallboardView() {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = () => api.getWallboard().then(setData).catch(console.error);
    load();
    const id = setInterval(() => { load(); setTick(t => t+1); }, 5000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="flex items-center justify-center h-full text-gray-400">Loading wallboard…</div>;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Live Wallboard</h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw size={12} className="animate-spin"/>
          <span>Live — updates every 5s</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Phone} label="Active Calls" value={data.activeCalls?.length || 0} color="blue"/>
        <MetricCard icon={Users} label="Queue Depth" value={data.queueDepth || 0} color="yellow"/>
        <MetricCard icon={PhoneMissed} label="Abandoned Today" value={data.abandonedToday || 0} color="red"/>
        <MetricCard icon={TrendingUp} label="Total Today" value={data.totalToday || 0} color="green"/>
      </div>

      {/* Active Calls */}
      <div className="bg-[#1e1e3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Active Calls ({data.activeCalls?.length || 0})
        </h3>
        {data.activeCalls?.length === 0 && <p className="text-gray-500 text-sm">No active calls</p>}
        <div className="space-y-2">
          {(data.activeCalls || []).map(c => (
            <div key={c.id} className="bg-[#2a2a4a] rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{c.callerName}</div>
                <div className="text-xs text-gray-400">{c.callerNumber} · {c.direction}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-mono text-sm">{formatDur(c.duration)}</span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">{c.agentName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div className="bg-[#1e1e3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Users size={14}/> Agents</h3>
        <div className="space-y-2">
          {(data.agents || []).map((a, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {(a.name||'?')[0]}
                </div>
                <span className="text-sm text-white">{a.name}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                a.status==='available' ? 'bg-green-500/20 text-green-400' :
                a.status==='busy' ? 'bg-red-500/20 text-red-400' :
                a.status==='dnd' ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avg Wait Time */}
      {data.avgWaitTime > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
          <Clock size={20} className="text-yellow-400"/>
          <div>
            <div className="text-sm font-medium text-yellow-300">Avg Wait Time</div>
            <div className="text-2xl font-bold text-yellow-400">{data.avgWaitTime}s</div>
          </div>
        </div>
      )}
    </div>
  );
}
