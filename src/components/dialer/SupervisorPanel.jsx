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
              className={`p-3 rounded-xl border text-left transition ${mode===m.id ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-[#2a2a4a] border-[#3a3a5a] text-gray-400 hover:border-[#4a4a6a]'}`}>
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
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${a.status==='available'?'bg-green-500/20 text-green-400':a.status==='busy'?'bg-red-500/20 text-red-400':'bg-gray-500/20 text-gray-400'}`}>{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
