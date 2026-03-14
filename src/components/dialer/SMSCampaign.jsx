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
    api.getContacts().then(cs => { const arr = Array.isArray(cs) ? cs : (cs?.contacts || []); setContacts(arr); }).catch(console.error);
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
    if (!confirm(`Send to ${selected.length} contacts?`)) return;
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
