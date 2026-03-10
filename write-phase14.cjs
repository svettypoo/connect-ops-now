
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'src');

const files = {};

// ── Updated inboxAiClient.js ─────────────────────────────────────────────────
files[path.join(src, 'api/inboxAiClient.js')] = `
// Inbox AI API client — replaces base44
const BASE = import.meta.env.VITE_API_BASE || 'https://web-production-bb17f2.up.railway.app';

async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || res.statusText); }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  // ── Auth
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),

  // ── Phone
  getPhoneToken: () => request('GET', '/api/phone/token'),
  getPhoneMe: () => request('GET', '/api/phone/me'),
  warmTransfer: (call_control_id, destination) => request('POST', '/api/phone/warm-transfer', { call_control_id, destination }),
  supervisorListen: (call_control_id, mode) => request('POST', '/api/phone/supervisor/listen', { call_control_id, mode }),
  getCallerContext: (number) => request('GET', \`/api/phone/context/\${encodeURIComponent(number)}\`),

  // ── Call Logs
  getCallLogs: (filter) => request('GET', \`/api/call-logs\${filter ? \`?filter=\${filter}\` : ''}\`),
  deleteCallLog: (id) => request('DELETE', \`/api/call-logs/\${id}\`),

  // ── Voicemails
  getVoicemails: () => request('GET', '/api/voicemails'),
  markVoicemailRead: (id) => request('PATCH', \`/api/voicemails/\${id}/read\`),
  getVoicemailAudio: (id) => \`\${BASE}/api/voicemails/\${id}/audio\`,

  // ── Contacts
  getContacts: () => request('GET', '/api/phone-contacts'),
  createContact: (data) => request('POST', '/api/phone-contacts', data),
  updateContact: (id, data) => request('PATCH', \`/api/phone-contacts/\${id}\`, data),
  deleteContact: (id) => request('DELETE', \`/api/phone-contacts/\${id}\`),

  // ── SMS
  getSmsThreads: () => request('GET', '/api/sms/threads'),
  getSmsThread: (number) => request('GET', \`/api/sms/thread/\${encodeURIComponent(number)}\`),
  sendSms: (to, body) => request('POST', '/api/sms/send', { to, body }),
  markThreadRead: (number) => request('POST', \`/api/sms/thread/\${encodeURIComponent(number)}/read\`),
  getSmsReplySuggestions: (threadNumber) => request('GET', \`/api/sms/suggest-replies?number=\${encodeURIComponent(threadNumber)}\`),
  createSmsCampaign: (data) => request('POST', '/api/sms/campaign', data),
  getSmsCampaigns: () => request('GET', '/api/sms/campaigns'),

  // ── AI
  askAI: (prompt) => request('POST', '/api/ai/ask', { message: prompt }),
  getCallScore: (data) => request('POST', '/api/ai/call-score', data),
  getCallScores: () => request('GET', '/api/ai/call-scores'),
  getSentiment: (text) => request('POST', '/api/ai/sentiment', { text }),

  // ── Recordings
  getRecordings: () => request('GET', '/api/recordings'),
  streamRecording: (id) => \`\${BASE}/api/recordings/\${id}/stream\`,

  // ── Meetings
  getJaaSToken: () => request('GET', '/api/meetings/jaas-token'),
  getMeetings: () => request('GET', '/api/meetings'),
  createMeeting: (data) => request('POST', '/api/meetings', data),
  aiCall: (to, message, voice) => request('POST', '/api/phone/ai-call', { to, message, voice }),

  // ── Analytics
  getCallAnalytics: (range) => request('GET', \`/api/analytics/calls?range=\${range || '7d'}\`),
  getAgentAnalytics: () => request('GET', '/api/analytics/agents'),

  // ── Presence
  getPresence: () => request('GET', '/api/presence'),
  setPresence: (status) => request('POST', '/api/presence', { status }),

  // ── Business Hours
  getBusinessHours: () => request('GET', '/api/business-hours'),
  setBusinessHours: (config) => request('POST', '/api/business-hours', config),

  // ── Channels
  getChannels: () => request('GET', '/api/channels'),
  createChannel: (data) => request('POST', '/api/channels', data),
  getChannelMessages: (id) => request('GET', \`/api/channels/\${id}/messages\`),
  sendChannelMessage: (id, body) => request('POST', \`/api/channels/\${id}/messages\`, { body }),

  // ── Hunt Groups
  getHuntGroups: () => request('GET', '/api/hunt-groups'),
  createHuntGroup: (data) => request('POST', '/api/hunt-groups', data),
  deleteHuntGroup: (id) => request('DELETE', \`/api/hunt-groups/\${id}\`),

  // ── Wallboard
  getWallboard: () => request('GET', '/api/wallboard/status'),

  // ── IVR
  getIVRConfigs: () => request('GET', '/api/ivr'),
  createIVRConfig: (data) => request('POST', '/api/ivr', data),
  updateIVRConfig: (id, data) => request('PATCH', \`/api/ivr/\${id}\`, data),

  // ── Admin
  getAdminUsers: () => request('GET', '/api/admin/users'),
  createAdminUser: (data) => request('POST', '/api/admin/users', data),
  deleteAdminUser: (id) => request('DELETE', \`/api/admin/users/\${id}\`),

  // ── AI Receptionist
  getAIReceptionistConfig: () => request('GET', '/api/ai-receptionist/config'),
  setAIReceptionistConfig: (data) => request('POST', '/api/ai-receptionist/config', data),

  // ── Callbacks
  scheduleCallback: (data) => request('POST', '/api/callback/schedule', data),
  getScheduledCallbacks: () => request('GET', '/api/callback/scheduled'),
};

export default api;
`;

// ── AnalyticsDashboard.jsx ──────────────────────────────────────────────────
files[path.join(src, 'components/dialer/AnalyticsDashboard.jsx')] = `
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
      <div className={\`p-3 rounded-lg \${colors[color]}\`}><Icon size={22}/></div>
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
              className={\`px-3 py-1.5 rounded-lg text-sm font-medium transition \${range===r ? 'bg-blue-600 text-white' : 'bg-[#1e1e3a] text-gray-400 hover:bg-[#2a2a4a]'}\`}>
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
                    <span className={\`px-2 py-0.5 rounded-full text-xs \${a.status==='available'?'bg-green-500/20 text-green-400':'bg-gray-500/20 text-gray-400'}\`}>{a.status}</span>
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
                  <span className={\`text-lg font-bold \${s.score>=80?'text-green-400':s.score>=60?'text-yellow-400':'text-red-400'}\`}>{s.score}/100</span>
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
`;

// ── ChannelsView.jsx ──────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/ChannelsView.jsx')] = `
import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/inboxAiClient';
import { Hash, Plus, Send, Users } from 'lucide-react';

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts), n = new Date();
  const diff = Math.round((n - d) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return diff + 'm ago';
  if (diff < 1440) return Math.round(diff/60) + 'h ago';
  return d.toLocaleDateString();
}

export default function ChannelsView() {
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.getChannels().then(chs => { setChannels(chs); if (chs.length) setActiveId(chs[0].id); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const load = () => api.getChannelMessages(activeId).then(setMessages).catch(() => {});
    load();
    pollRef.current = setInterval(load, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !activeId) return;
    const t = text.trim(); setText('');
    await api.sendChannelMessage(activeId, t);
    const msgs = await api.getChannelMessages(activeId);
    setMessages(msgs);
  };

  const createChannel = async () => {
    if (!newName.trim()) return;
    const ch = await api.createChannel({ name: newName.trim(), type: 'public' });
    const chs = await api.getChannels();
    setChannels(chs); setActiveId(ch.id); setShowNew(false); setNewName('');
  };

  const active = channels.find(c => c.id === activeId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 bg-[#151528] border-r border-[#1e1e3a] flex flex-col">
        <div className="p-3 border-b border-[#1e1e3a] flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</span>
          <button onClick={() => setShowNew(true)} className="text-gray-400 hover:text-white transition"><Plus size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveId(ch.id)}
              className={\`w-full flex items-center gap-2 px-3 py-2 text-sm transition \${activeId===ch.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-[#1e1e3a] hover:text-white'}\`}>
              <Hash size={13} className="shrink-0"/>
              <span className="truncate">{ch.name}</span>
              {ch.unread > 0 && <span className="ml-auto bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{ch.unread}</span>}
            </button>
          ))}
        </div>
        {showNew && (
          <div className="p-3 border-t border-[#1e1e3a] space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="channel-name" onKeyDown={e => e.key==='Enter' && createChannel()}
              className="w-full bg-[#1e1e3a] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#2a2a4a] focus:border-blue-500"/>
            <div className="flex gap-2">
              <button onClick={createChannel} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700">Create</button>
              <button onClick={() => setShowNew(false)} className="flex-1 bg-[#2a2a4a] text-gray-400 text-xs py-1.5 rounded-lg hover:bg-[#3a3a5a]">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {active && (
          <div className="px-4 py-3 border-b border-[#1e1e3a] flex items-center gap-2">
            <Hash size={16} className="text-gray-400"/>
            <span className="font-semibold text-white">{active.name}</span>
            <Users size={13} className="text-gray-500 ml-2"/>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-center text-gray-500 text-sm mt-10">No messages yet. Say hello!</p>}
          {messages.map(m => (
            <div key={m.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {(m.sender_name||'?')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-white">{m.sender_name || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">{timeAgo(m.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5">{m.body}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        <div className="p-3 border-t border-[#1e1e3a]">
          <div className="flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key==='Enter' && send()}
              placeholder={\`Message #\${active?.name||'channel'}\`}
              className="flex-1 bg-[#1e1e3a] text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-[#2a2a4a] focus:border-blue-500 placeholder-gray-500"/>
            <button onClick={send} disabled={!text.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition">
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// ── WallboardView.jsx ─────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/WallboardView.jsx')] = `
import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Phone, PhoneMissed, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react';

function formatDur(secs) {
  const m = Math.floor(secs/60), s = secs%60;
  return \`\${String(m).padStart(2,'0')}:\${String(s).padStart(2,'0')}\`;
}

function MetricCard({ icon: Icon, label, value, color }) {
  const c = { blue:'text-blue-400 bg-blue-500/20', red:'text-red-400 bg-red-500/20', green:'text-green-400 bg-green-500/20', yellow:'text-yellow-400 bg-yellow-500/20' };
  return (
    <div className="bg-[#1e1e3a] rounded-xl p-5 flex flex-col items-center gap-2">
      <div className={\`p-3 rounded-xl \${c[color]}\`}><Icon size={24}/></div>
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
              <span className={\`px-2.5 py-1 rounded-full text-xs font-medium \${
                a.status==='available' ? 'bg-green-500/20 text-green-400' :
                a.status==='busy' ? 'bg-red-500/20 text-red-400' :
                a.status==='dnd' ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-500/20 text-gray-400'
              }\`}>{a.status}</span>
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
`;

// ── IVRBuilder.jsx ─────────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/IVRBuilder.jsx')] = `
import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Plus, Trash2, Wand2, CheckCircle, GitBranch } from 'lucide-react';

const NODE_TYPES = ['greeting','menu','transfer','voicemail','hangup'];
const NODE_COLORS = { greeting:'bg-blue-500/20 border-blue-500/50 text-blue-300', menu:'bg-purple-500/20 border-purple-500/50 text-purple-300', transfer:'bg-green-500/20 border-green-500/50 text-green-300', voicemail:'bg-yellow-500/20 border-yellow-500/50 text-yellow-300', hangup:'bg-red-500/20 border-red-500/50 text-red-300' };

export default function IVRBuilder() {
  const [configs, setConfigs] = useState([]);
  const [active, setActive] = useState(null);
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [nodes, setNodes] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.getIVRConfigs().then(setConfigs).catch(console.error); }, []);

  const loadConfig = (c) => { setActive(c); setName(c.name); setGreeting(c.greeting||''); setNodes(c.nodes||[]); setSaved(false); };

  const newConfig = () => { setActive(null); setName('My IVR'); setGreeting('Thank you for calling. Press 1 for Sales, 2 for Support, 3 to leave a voicemail.'); setNodes([]); setSaved(false); };

  const addNode = () => setNodes(n => [...n, { id: Date.now(), type: 'menu', label: 'New Step', key: '', action: '' }]);

  const updateNode = (i, k, v) => setNodes(n => n.map((nd, idx) => idx===i ? { ...nd, [k]: v } : nd));

  const removeNode = (i) => setNodes(n => n.filter((_,idx) => idx!==i));

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      const resp = await api.askAI(
        \`You are an IVR designer. Generate an IVR flow for: "\${aiPrompt}".
Return JSON only: { "greeting": "...", "nodes": [{ "type": "greeting|menu|transfer|voicemail|hangup", "label": "...", "key": "1", "action": "..." }] }
Make it professional and complete.\`
      );
      const json = JSON.parse((resp.match(/\\{[\\s\\S]*\\}/) || ['{}'])[0]);
      if (json.greeting) setGreeting(json.greeting);
      if (json.nodes) setNodes(json.nodes.map((n,i) => ({ ...n, id: Date.now()+i })));
    } catch (e) { alert('AI generation failed: ' + e.message); }
    setLoading(false);
  };

  const save = async () => {
    setLoading(true);
    try {
      if (active) {
        await api.updateIVRConfig(active.id, { name, greeting, nodes, active: false });
      } else {
        await api.createIVRConfig({ name, greeting, nodes, active: false });
      }
      const cs = await api.getIVRConfigs();
      setConfigs(cs); setSaved(true);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 bg-[#151528] border-r border-[#1e1e3a] flex flex-col">
        <div className="p-3 border-b border-[#1e1e3a] flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase">IVR Configs</span>
          <button onClick={newConfig} className="text-gray-400 hover:text-white"><Plus size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {configs.map(c => (
            <button key={c.id} onClick={() => loadConfig(c)}
              className={\`w-full px-3 py-2.5 text-left text-sm transition flex items-center gap-2 \${active?.id===c.id ? 'bg-blue-600/20 text-blue-400':'text-gray-400 hover:bg-[#1e1e3a] hover:text-white'}\`}>
              <GitBranch size={13}/><span className="truncate">{c.name}</span>
              {c.active ? <CheckCircle size={12} className="ml-auto text-green-400"/> : null}
            </button>
          ))}
          {configs.length===0 && <p className="text-center text-gray-500 text-xs mt-4">Click + to create</p>}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">IVR Builder</h2>
          {saved && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={14}/>Saved</span>}
        </div>

        {/* AI Generator */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2"><Wand2 size={14}/> AI IVR Generator</p>
          <div className="flex gap-2">
            <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="Describe your business (e.g. 'dental office with sales, appointments, billing')"
              className="flex-1 bg-[#1e1e3a] text-white text-sm rounded-lg px-3 py-2 outline-none border border-purple-500/30 focus:border-purple-400 placeholder-gray-500"/>
            <button onClick={generateWithAI} disabled={loading}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg disabled:opacity-50 transition">
              {loading ? '…' : 'Generate'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs text-gray-400 font-semibold uppercase">Config Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-[#1e1e3a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#2a2a4a] focus:border-blue-500"/>
        </div>

        <div className="space-y-3">
          <label className="text-xs text-gray-400 font-semibold uppercase">Greeting Message</label>
          <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={3}
            placeholder="What callers hear when they call..."
            className="w-full bg-[#1e1e3a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#2a2a4a] focus:border-blue-500 resize-none placeholder-gray-500"/>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-semibold uppercase">Flow Nodes ({nodes.length})</label>
            <button onClick={addNode} className="text-xs bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-lg hover:bg-blue-600/40 flex items-center gap-1"><Plus size={12}/>Add Node</button>
          </div>
          {nodes.map((nd, i) => (
            <div key={nd.id||i} className={\`border rounded-xl p-4 space-y-3 \${NODE_COLORS[nd.type]||'bg-gray-500/20 border-gray-500/50'}\`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase">{nd.type}</span>
                <button onClick={() => removeNode(i)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Type</label>
                  <select value={nd.type} onChange={e => updateNode(i,'type',e.target.value)}
                    className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-2 py-1.5 outline-none border border-[#2a2a4a] mt-1">
                    {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Key Press</label>
                  <input value={nd.key||''} onChange={e => updateNode(i,'key',e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-2 py-1.5 outline-none border border-[#2a2a4a] mt-1"/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400">Label / Description</label>
                  <input value={nd.label||''} onChange={e => updateNode(i,'label',e.target.value)}
                    placeholder="e.g. Sales team"
                    className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-2 py-1.5 outline-none border border-[#2a2a4a] mt-1"/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400">Action / Number</label>
                  <input value={nd.action||''} onChange={e => updateNode(i,'action',e.target.value)}
                    placeholder="e.g. +15551234567 or voicemail"
                    className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-2 py-1.5 outline-none border border-[#2a2a4a] mt-1"/>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={save} disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 transition">
          {loading ? 'Saving…' : 'Save IVR Config'}
        </button>
      </div>
    </div>
  );
}
`;

// ── AdminPanel.jsx ────────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/AdminPanel.jsx')] = `
import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Users, UserPlus, Trash2, Clock, Shield } from 'lucide-react';

const STATUS_COLORS = { available:'bg-green-500/20 text-green-400', busy:'bg-red-500/20 text-red-400', offline:'bg-gray-500/20 text-gray-400', dnd:'bg-orange-500/20 text-orange-400' };

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [businessHours, setBusinessHours] = useState({});
  const [saving, setSaving] = useState(false);

  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  useEffect(() => {
    api.getAdminUsers().then(setUsers).catch(console.error);
    api.getBusinessHours().then(bh => {
      if (!Object.keys(bh).length) {
        const d = {};
        DAYS.forEach(day => { d[day] = { enabled: ['monday','tuesday','wednesday','thursday','friday'].includes(day), open:'09:00', close:'17:00' }; });
        setBusinessHours(d);
      } else setBusinessHours(bh);
    }).catch(console.error);
  }, []);

  const createUser = async () => {
    if (!form.email || !form.name) return;
    setLoading(true);
    try {
      await api.createAdminUser(form);
      const us = await api.getAdminUsers();
      setUsers(us); setShowNew(false); setForm({ name:'', email:'', password:'' });
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.deleteAdminUser(id);
    setUsers(u => u.filter(x => x.id !== id));
  };

  const saveHours = async () => {
    setSaving(true);
    await api.setBusinessHours(businessHours).catch(console.error);
    setSaving(false);
  };

  const updateDay = (day, k, v) => setBusinessHours(h => ({ ...h, [day]: { ...h[day], [k]: v } }));

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield size={20}/>Admin Panel</h2>

      {/* Users */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2"><Users size={16}/>Team Members ({users.length})</h3>
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
            <UserPlus size={14}/>Add User
          </button>
        </div>

        {showNew && (
          <div className="bg-[#2a2a4a] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} placeholder="Full Name"
                className="bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
              <input value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} placeholder="Email"
                className="bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
            </div>
            <input value={form.password} onChange={e => setForm(f => ({...f,password:e.target.value}))} placeholder="Password (optional — defaults to TempPass123!)" type="password"
              className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
            <div className="flex gap-2">
              <button onClick={createUser} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg disabled:opacity-50">
                {loading ? 'Creating…' : 'Create User'}
              </button>
              <button onClick={() => setShowNew(false)} className="px-4 bg-[#1a1a2e] text-gray-400 text-sm py-2 rounded-lg hover:bg-[#3a3a5a]">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-[#2a2a4a] rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">{(u.name||u.email||'?')[0].toUpperCase()}</div>
                <div>
                  <div className="text-sm font-medium text-white">{u.name || u.email}</div>
                  <div className="text-xs text-gray-400">{u.email} {u.phone_number ? '· ' + u.phone_number : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={\`px-2.5 py-1 rounded-full text-xs \${STATUS_COLORS[u.presence] || STATUS_COLORS.offline}\`}>{u.presence || 'offline'}</span>
                <button onClick={() => deleteUser(u.id)} className="text-gray-500 hover:text-red-400 transition"><Trash2 size={15}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><Clock size={16}/>Business Hours</h3>
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-400 capitalize">{day.slice(0,3)}</div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={businessHours[day]?.enabled||false}
                  onChange={e => updateDay(day,'enabled',e.target.checked)} className="sr-only peer"/>
                <div className="w-9 h-5 bg-gray-600 peer-checked:bg-blue-600 rounded-full transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"/>
              </label>
              {businessHours[day]?.enabled && <>
                <input type="time" value={businessHours[day]?.open||'09:00'}
                  onChange={e => updateDay(day,'open',e.target.value)}
                  className="bg-[#2a2a4a] text-white text-sm rounded-lg px-2 py-1 outline-none border border-[#3a3a5a]"/>
                <span className="text-gray-500 text-sm">to</span>
                <input type="time" value={businessHours[day]?.close||'17:00'}
                  onChange={e => updateDay(day,'close',e.target.value)}
                  className="bg-[#2a2a4a] text-white text-sm rounded-lg px-2 py-1 outline-none border border-[#3a3a5a]"/>
              </>}
            </div>
          ))}
        </div>
        <button onClick={saveHours} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Save Business Hours'}
        </button>
      </div>
    </div>
  );
}
`;

// ── AIReceptionist.jsx ────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/AIReceptionist.jsx')] = `
import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Bot, Save, CheckCircle, Wand2, PhoneCall } from 'lucide-react';

export default function AIReceptionist() {
  const [config, setConfig] = useState({ enabled: false, business_name: '', greeting: '', transfer_to: '', voicemail_prompt: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => { api.getAIReceptionistConfig().then(c => setConfig(c || {})).catch(console.error); }, []);

  const save = async () => {
    setSaving(true);
    await api.setAIReceptionistConfig(config).catch(e => alert(e.message));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const generateGreeting = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const resp = await api.askAI(
        \`Write a professional phone greeting for: "\${aiPrompt}".
Max 2 sentences. Natural and friendly. Just the greeting text, nothing else.\`
      );
      setConfig(c => ({ ...c, greeting: resp.trim() }));
    } catch (e) { alert(e.message); }
    setGenerating(false);
  };

  const upd = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bot size={22} className="text-purple-400"/>AI Receptionist</h2>
        {saved && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={14}/>Saved</span>}
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <p className="text-sm text-purple-300 mb-1 font-medium">What is this?</p>
        <p className="text-sm text-gray-400">The AI Receptionist answers inbound calls automatically using Claude AI, speaks naturally with callers, gathers information, and routes or takes messages — no human required.</p>
      </div>

      {/* Enable toggle */}
      <div className="bg-[#1e1e3a] rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-white">Enable AI Receptionist</div>
          <div className="text-xs text-gray-400">Automatically answer inbound calls with AI</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={config.enabled||false} onChange={e => upd('enabled', e.target.checked)} className="sr-only peer"/>
          <div className="w-11 h-6 bg-gray-600 peer-checked:bg-blue-600 rounded-full transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"/>
        </label>
      </div>

      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Business Name</label>
          <input value={config.business_name||''} onChange={e => upd('business_name', e.target.value)}
            placeholder="e.g. ST Properties"
            className="w-full mt-1.5 bg-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
        </div>

        {/* AI Greeting Generator */}
        <div className="bg-[#151528] rounded-lg p-3 space-y-2">
          <label className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-1.5"><Wand2 size={12}/>Generate Greeting with AI</label>
          <div className="flex gap-2">
            <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="Describe your business..."
              className="flex-1 bg-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-purple-400"/>
            <button onClick={generateGreeting} disabled={generating}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg disabled:opacity-50">
              {generating ? '…' : 'Generate'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Greeting Script</label>
          <textarea value={config.greeting||''} onChange={e => upd('greeting', e.target.value)} rows={4}
            placeholder="Thank you for calling {business_name}. I'm your AI assistant. How can I help you today?"
            className="w-full mt-1.5 bg-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#3a3a5a] focus:border-blue-500 resize-none placeholder-gray-500"/>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase flex items-center gap-1.5"><PhoneCall size={12}/>Transfer Number</label>
          <input value={config.transfer_to||''} onChange={e => upd('transfer_to', e.target.value)}
            placeholder="+15551234567 — where to transfer if caller needs a human"
            className="w-full mt-1.5 bg-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-semibold uppercase">Voicemail Instruction Prompt</label>
          <textarea value={config.voicemail_prompt||''} onChange={e => upd('voicemail_prompt', e.target.value)} rows={3}
            placeholder="When callers want to leave a message, say: 'I'll take your message and have someone call you back shortly. Please state your name and number.'"
            className="w-full mt-1.5 bg-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#3a3a5a] focus:border-blue-500 resize-none placeholder-gray-500"/>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2">
        <Save size={16}/>{saving ? 'Saving…' : 'Save AI Receptionist Config'}
      </button>
    </div>
  );
}
`;

// ── SMSCampaign.jsx ───────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/SMSCampaign.jsx')] = `
import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Megaphone, Wand2, Send, CheckCircle, Users, Eye } from 'lucide-react';

export default function SMSCampaign() {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.getContacts().then(setContacts).catch(console.error);
    api.getSmsCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  const toggleContact = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);

  const selectAll = () => setSelected(contacts.map(c => c.id));

  const generatePreview = async () => {
    if (!prompt.trim() || !selected.length) return;
    setLoading(true);
    try {
      const result = await api.createSmsCampaign({ contact_ids: selected, prompt, preview: true });
      setPreview(result.messages);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const sendCampaign = async () => {
    if (!confirm(\`Send to \${selected.length} contacts?\`)) return;
    setLoading(true);
    try {
      const result = await api.createSmsCampaign({ contact_ids: selected, prompt });
      setSent(true);
      const cs = await api.getSmsCampaigns();
      setCampaigns(cs); setPreview(null); setPrompt(''); setSelected([]);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Megaphone size={20} className="text-yellow-400"/>SMS Campaigns</h2>

      {sent && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400"/>
          <span className="text-green-300 text-sm">Campaign sent successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Setup */}
        <div className="space-y-5">
          <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><Wand2 size={15} className="text-yellow-400"/>Campaign Message</h3>
            <div>
              <label className="text-xs text-gray-400 font-semibold uppercase">AI Prompt / Message Goal</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder="Describe what you want to say — AI will personalize for each contact. E.g. 'Remind them about our spring sale, 20% off all services this week only.'"
                className="w-full mt-1.5 bg-[#2a2a4a] text-white text-sm rounded-lg px-3 py-2.5 outline-none border border-[#3a3a5a] focus:border-yellow-400 resize-none placeholder-gray-500"/>
            </div>
          </div>

          <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2"><Users size={15}/>Select Recipients</h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300">All</button>
                <button onClick={() => setSelected([])} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
              </div>
            </div>
            <p className="text-xs text-gray-500">{selected.length} of {contacts.length} selected</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {contacts.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2a2a4a] cursor-pointer">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleContact(c.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-[#2a2a4a] accent-blue-600"/>
                  <div>
                    <div className="text-sm text-white">{c.name || c.phone}</div>
                    <div className="text-xs text-gray-500">{c.phone}</div>
                  </div>
                </label>
              ))}
              {contacts.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No contacts yet</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={generatePreview} disabled={loading || !prompt || !selected.length}
              className="flex-1 py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/40 rounded-xl text-sm font-medium disabled:opacity-40 transition flex items-center justify-center gap-2">
              <Eye size={14}/>{loading ? 'Generating…' : 'Preview Messages'}
            </button>
            <button onClick={sendCampaign} disabled={loading || !prompt || !selected.length}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition flex items-center justify-center gap-2">
              <Send size={14}/>{loading ? 'Sending…' : 'Send Campaign'}
            </button>
          </div>
        </div>

        {/* Right: Preview + History */}
        <div className="space-y-5">
          {preview && (
            <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Message Preview (first {preview.length})</h3>
              <div className="space-y-3">
                {preview.map((m, i) => (
                  <div key={i} className="bg-[#2a2a4a] rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{m.contact?.name || m.contact?.phone}</div>
                    <p className="text-sm text-white">{m.message}</p>
                    <div className="text-xs text-gray-500 mt-1">{m.message?.length || 0}/160 chars</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaigns.length > 0 && (
            <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Past Campaigns</h3>
              <div className="space-y-2">
                {campaigns.map(c => (
                  <div key={c.id} className="bg-[#2a2a4a] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{c.created_at?.slice(0,10)}</span>
                      <span className="text-xs text-green-400">{c.sent_count} sent</span>
                    </div>
                    <p className="text-xs text-gray-300 truncate">{c.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

// ── SupervisorPanel.jsx ────────────────────────────────────────────────────────
files[path.join(src, 'components/dialer/SupervisorPanel.jsx')] = `
import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Eye, Mic, PhoneCall, Volume2, Users } from 'lucide-react';

export default function SupervisorPanel() {
  const [wallboard, setWallboard] = useState(null);
  const [listening, setListening] = useState(null);
  const [mode, setMode] = useState('listen');

  useEffect(() => {
    const load = () => api.getWallboard().then(setWallboard).catch(console.error);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const joinCall = async (call) => {
    try {
      const result = await api.supervisorListen(call.callControlId, mode);
      setListening({ ...call, mode, webrtcToken: result.webrtc_token });
    } catch (e) { alert('Could not join call: ' + e.message); }
  };

  const MODES = [
    { id:'listen', label:'Silent Listen', icon: Volume2, desc:'Hear the call, neither party knows' },
    { id:'whisper', label:'Whisper', icon: Mic, desc:'Speak only to the agent, caller cannot hear' },
    { id:'barge', label:'Barge In', icon: PhoneCall, desc:'Join full 3-way — all parties hear each other' },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Eye size={20} className="text-orange-400"/>Supervisor Panel</h2>

      {listening && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-orange-300 font-medium">{listening.mode === 'listen' ? '🎧 Silent Listening' : listening.mode === 'whisper' ? '🤫 Whispering to Agent' : '📞 Barged In'}</div>
              <div className="text-sm text-gray-400 mt-0.5">{listening.callerName} — {listening.callerNumber}</div>
            </div>
            <button onClick={() => setListening(null)}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition">
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white text-sm">Monitoring Mode</h3>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={\`p-3 rounded-xl border text-left transition \${mode===m.id ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#2a2a4a] border-[#3a3a5a] text-gray-400 hover:border-[#4a4a6a]'}\`}>
              <m.icon size={18} className="mb-2"/>
              <div className="text-xs font-semibold">{m.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active calls */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Active Calls
        </h3>
        {!wallboard?.activeCalls?.length && <p className="text-gray-500 text-sm">No active calls to monitor</p>}
        {(wallboard?.activeCalls||[]).map(c => (
          <div key={c.id} className="bg-[#2a2a4a] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-white">{c.callerName}</div>
              <div className="text-xs text-gray-400">{c.callerNumber} · {c.agentName} · {Math.floor(c.duration/60)}:{String(c.duration%60).padStart(2,'0')}</div>
            </div>
            <button onClick={() => joinCall(c)}
              className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-600/30 text-sm rounded-lg transition flex items-center gap-1.5">
              <Eye size={13}/>{mode === 'listen' ? 'Listen' : mode === 'whisper' ? 'Whisper' : 'Barge'}
            </button>
          </div>
        ))}
      </div>

      {/* All agents */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2"><Users size={14}/>All Agents</h3>
        {(wallboard?.agents||[]).map((a, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-600/60 flex items-center justify-center text-xs font-bold text-white">{(a.name||'?')[0]}</div>
              <span className="text-sm text-white">{a.name}</span>
            </div>
            <span className={\`px-2.5 py-1 rounded-full text-xs font-medium \${a.status==='available'?'bg-green-500/20 text-green-400':a.status==='busy'?'bg-red-500/20 text-red-400':'bg-gray-500/20 text-gray-400'}\`}>{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

// ── Updated RCSidebar.jsx ──────────────────────────────────────────────────────
files[path.join(src, 'components/rc/RCSidebar.jsx')] = `
import { Phone, MessageSquare, Voicemail, Video, Users, Hash, BarChart2, Shield, Monitor, GitBranch, Bot, Megaphone, Headphones } from 'lucide-react';

const NAV = [
  { id: 'dialpad', icon: Hash, label: 'Dialpad' },
  { id: 'recent', icon: Phone, label: 'Calls' },
  { id: 'voicemail', icon: Voicemail, label: 'Voicemail' },
  { id: 'message', icon: MessageSquare, label: 'SMS' },
  { id: 'channels', icon: MessageSquare, label: 'Channels', iconClass: 'text-indigo-400' },
  { id: 'video', icon: Video, label: 'Video' },
  { id: 'contacts', icon: Users, label: 'Contacts' },
  null, // divider
  { id: 'analytics', icon: BarChart2, label: 'Analytics', iconClass: 'text-blue-400' },
  { id: 'wallboard', icon: Monitor, label: 'Wallboard', iconClass: 'text-green-400' },
  { id: 'supervisor', icon: Headphones, label: 'Supervisor', iconClass: 'text-orange-400' },
  { id: 'sms-campaign', icon: Megaphone, label: 'Campaigns', iconClass: 'text-yellow-400' },
  null, // divider
  { id: 'ivr', icon: GitBranch, label: 'IVR', iconClass: 'text-purple-400' },
  { id: 'ai-receptionist', icon: Bot, label: 'AI Desk', iconClass: 'text-purple-400' },
  { id: 'admin', icon: Shield, label: 'Admin', iconClass: 'text-red-400' },
];

export default function RCSidebar({ activeNav, setActiveNav, user, onLogout, vmUnread = 0 }) {
  return (
    <div className="w-16 bg-[#111126] flex flex-col items-center py-4 gap-1 border-r border-[#1e1e3a]">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm mb-3">C</div>

      <div className="flex-1 flex flex-col items-center gap-0.5 w-full overflow-y-auto">
        {NAV.map((item, i) => {
          if (!item) return <div key={i} className="w-8 border-t border-[#1e1e3a] my-1"/>;
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button key={item.id} onClick={() => setActiveNav(item.id)} title={item.label}
              className={\`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all \${active ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:bg-[#1e1e3a] hover:text-gray-300'}\`}>
              {active && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-r-full"/>}
              <Icon size={18} className={!active && item.iconClass ? item.iconClass : undefined}/>
              <span className="text-[9px] leading-none">{item.label.slice(0,6)}</span>
              {item.id === 'voicemail' && vmUnread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{vmUnread}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Avatar */}
      <button onClick={onLogout} title="Logout"
        className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold mt-2 hover:opacity-80 transition">
        {(user?.name || user?.email || 'U')[0].toUpperCase()}
      </button>
    </div>
  );
}
`;

// ── Updated Dialer.jsx ──────────────────────────────────────────────────────────
files[path.join(src, 'pages/Dialer.jsx')] = `
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/inboxAiClient';
import usePhone from '@/lib/usePhone';

import RCSidebar from '@/components/rc/RCSidebar';
import RCListPanel from '@/components/rc/RCListPanel';
import RCContactPanel from '@/components/rc/RCContactPanel';

import Dialpad from '@/components/dialer/Dialpad';
import VoiceCall from '@/components/dialer/VoiceCall';
import VideoCall from '@/components/dialer/VideoCall';
import Messaging from '@/components/dialer/Messaging';
import CallHistory from '@/components/dialer/CallHistory';
import VoicemailList from '@/components/dialer/VoicemailList';
import AnalyticsDashboard from '@/components/dialer/AnalyticsDashboard';
import ChannelsView from '@/components/dialer/ChannelsView';
import WallboardView from '@/components/dialer/WallboardView';
import IVRBuilder from '@/components/dialer/IVRBuilder';
import AdminPanel from '@/components/dialer/AdminPanel';
import AIReceptionist from '@/components/dialer/AIReceptionist';
import SMSCampaign from '@/components/dialer/SMSCampaign';
import SupervisorPanel from '@/components/dialer/SupervisorPanel';

const HAS_LIST = ['message','recent','contacts','voicemail','video','channels'];

export default function Dialer() {
  const { user, logout } = useAuth();
  const phone = usePhone();
  const [activeNav, setActiveNav] = useState('dialpad');
  const [dialTo, setDialTo] = useState('');
  const [dialName, setDialName] = useState('');
  const [activeContact, setActiveContact] = useState(null);
  const [vmUnread, setVmUnread] = useState(0);
  const [messageTo, setMessageTo] = useState('');

  useEffect(() => {
    api.getVoicemails().then(vms => setVmUnread(vms.filter(v => !v.is_read).length)).catch(() => {});
  }, [activeNav]);

  const callContact = (c) => { setDialTo(c.phone); setDialName(c.name||c.phone); setActiveNav('voice'); };
  const videoContact = (c) => { setActiveNav('video'); };
  const messageContact = (c) => { setMessageTo(c.phone); setActiveNav('message'); };

  const handleCallBack = (number, name) => { setDialTo(number); setDialName(name||number); setActiveNav('voice'); };
  const handleDialDirect = (number) => { setDialTo(number); setDialName(number); setActiveNav('voice'); };

  const inbound = phone.inboundCall;

  const showList = HAS_LIST.includes(activeNav);

  return (
    <div className="flex h-screen bg-[#0f0f23] overflow-hidden">
      <RCSidebar activeNav={activeNav} setActiveNav={setActiveNav} user={user} onLogout={logout} vmUnread={vmUnread}/>

      {showList && (
        <RCListPanel activeNav={activeNav} onSelectContact={c => { setActiveContact(c); }}
          onCallBack={handleCallBack} onSelectMessage={num => { setMessageTo(num); setActiveNav('message'); }}/>
      )}

      {/* Inbound call banner */}
      {inbound && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1e1e3a] border border-blue-500/50 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl animate-bounce-once">
          <div>
            <div className="text-xs text-blue-400 font-semibold uppercase">Incoming Call</div>
            <div className="text-white font-bold text-lg">{inbound.callerNumber}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => phone.answerCall()} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold transition">Answer</button>
            <button onClick={() => phone.hangup()} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold transition">Decline</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeNav === 'dialpad' && (
            <Dialpad phone={phone} onDial={handleDialDirect}/>
          )}
          {activeNav === 'voice' && (
            <VoiceCall phone={phone} dialTo={dialTo} dialName={dialName} onHangup={() => setActiveNav('recent')}/>
          )}
          {activeNav === 'video' && <VideoCall/>}
          {activeNav === 'message' && <Messaging initialTo={messageTo}/>}
          {activeNav === 'recent' && <CallHistory onCallBack={handleCallBack}/>}
          {activeNav === 'voicemail' && <VoicemailList onCallBack={handleCallBack}/>}
          {activeNav === 'contacts' && (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Select a contact from the list</div>
          )}
          {activeNav === 'analytics' && <AnalyticsDashboard/>}
          {activeNav === 'channels' && <ChannelsView/>}
          {activeNav === 'wallboard' && <WallboardView/>}
          {activeNav === 'ivr' && <IVRBuilder/>}
          {activeNav === 'admin' && <AdminPanel/>}
          {activeNav === 'ai-receptionist' && <AIReceptionist/>}
          {activeNav === 'sms-campaign' && <SMSCampaign/>}
          {activeNav === 'supervisor' && <SupervisorPanel/>}
        </div>

        {activeContact && HAS_LIST.includes(activeNav) && (
          <RCContactPanel contact={activeContact} onClose={() => setActiveContact(null)}
            onCall={() => callContact(activeContact)}
            onVideo={() => videoContact(activeContact)}
            onSms={() => messageContact(activeContact)}
            onEmail={() => window.open('mailto:' + activeContact.email)}/>
        )}
      </div>
    </div>
  );
}
`;

// Write all files
let written = 0;
for (const [fpath, content] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(fpath), { recursive: true });
  fs.writeFileSync(fpath, content.trimStart(), 'utf8');
  written++;
  console.log('Written:', fpath);
}
console.log(`\nAll ${written} files written.`);
