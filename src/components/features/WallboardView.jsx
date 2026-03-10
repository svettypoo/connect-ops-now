import { useState, useEffect, useRef } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import api from "@/api/inboxAiClient";

function Tile({ label, value, threshold, unit = "" }) {
  const num = typeof value === "number" ? value : parseFloat(value) || 0;
  const color = threshold
    ? num >= threshold.red ? "text-red-400 border-red-500/30" : num >= threshold.yellow ? "text-yellow-400 border-yellow-500/30" : "text-green-400 border-green-500/30"
    : "text-[#0EB8FF] border-[#0684BD]/30";
  return (
    <div className={"bg-white/5 rounded-2xl p-6 border flex flex-col items-center justify-center text-center " + color}>
      <p className="text-4xl font-black mb-2">{value ?? 0}{unit}</p>
      <p className="text-sm text-slate-400 font-medium">{label}</p>
    </div>
  );
}

const PRESENCE_COLOR = { available: "bg-green-400", busy: "bg-red-400", away: "bg-yellow-400", offline: "bg-slate-600" };

export default function WallboardView() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const pollRef = useRef(null);

  const load = () => {
    api.getWallboard()
      .then(d => {
        setData(d || {});
        setHistory(h => [...h.slice(-29), { t: Date.now(), queue: d?.calls_in_queue || 0 }]);
      })
      .catch(() => setData({}));
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const agents = data?.agents || [];

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Live Wallboard</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Updates every 5s
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Calls in Queue" value={data?.calls_in_queue ?? 0} threshold={{ yellow: 3, red: 7 }} />
        <Tile label="Active Agents" value={data?.active_agents ?? 0} />
        <Tile label="Avg Wait Time" value={data?.avg_wait_secs ? Math.round(data.avg_wait_secs) + "s" : "0s"} threshold={{ yellow: 60, red: 120 }} />
        <Tile label="Abandoned Today" value={data?.abandoned_today ?? 0} threshold={{ yellow: 5, red: 15 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold mb-3 text-slate-300">Queue Depth (last hour)</h3>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={history}>
              <Line type="monotone" dataKey="queue" stroke="#0EB8FF" strokeWidth={2} dot={false} />
              <Tooltip contentStyle={{ background: "#1e1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={v => [v, "Queue"]} labelFormatter={() => ""} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold mb-3 text-slate-300">Agent Status</h3>
          {agents.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6">No agent data available</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {agents.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={"w-2 h-2 rounded-full flex-shrink-0 " + (PRESENCE_COLOR[a.status] || PRESENCE_COLOR.offline)} />
                  <span className="text-sm flex-1">{a.name}</span>
                  <span className="text-xs text-slate-500 capitalize">{a.status || "offline"}</span>
                  {a.call_duration && <span className="text-xs font-mono text-slate-400">{a.call_duration}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
