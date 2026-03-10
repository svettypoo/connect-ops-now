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
        `Write a professional phone greeting for: "${aiPrompt}".
Max 2 sentences. Natural and friendly. Just the greeting text, nothing else.`
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
