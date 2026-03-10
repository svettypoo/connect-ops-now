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
        `You are an IVR designer. Generate an IVR flow for: "${aiPrompt}".
Return JSON only: { "greeting": "...", "nodes": [{ "type": "greeting|menu|transfer|voicemail|hangup", "label": "...", "key": "1", "action": "..." }] }
Make it professional and complete.`
      );
      const json = JSON.parse((resp.match(/\{[\s\S]*\}/) || ['{}'])[0]);
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
              className={`w-full px-3 py-2.5 text-left text-sm transition flex items-center gap-2 ${active?.id===c.id ? 'bg-blue-600/20 text-blue-400':'text-gray-400 hover:bg-[#1e1e3a] hover:text-white'}`}>
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
            <div key={nd.id||i} className={`border rounded-xl p-4 space-y-3 ${NODE_COLORS[nd.type]||'bg-gray-500/20 border-gray-500/50'}`}>
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
