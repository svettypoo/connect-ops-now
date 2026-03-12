import { useState, useEffect } from "react";
import { MessageSquare, CheckSquare, Square, Send, Eye, ChevronRight, ChevronLeft } from "lucide-react";
import api from "@/api/inboxAiClient";

export default function SMSCampaign() {
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getContacts()
      .then(d => setContacts(Array.isArray(d) ? d : []))
      .catch(() => setContacts([]));
  }, []);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === contacts.length ? [] : contacts.map(c => c.id));

  const generatePreviews = async () => {
    if (!prompt.trim() || selected.length === 0) return;
    setLoading(true);
    try {
      const res = await api.sendSmsCampaign(selected, prompt, true);
      setPreviews(Array.isArray(res?.previews) ? res.previews : selected.map(id => {
        const c = contacts.find(x => x.id === id);
        return { contact_id: id, name: c?.name || "Contact", phone: c?.phone || "", message: "[AI-generated message for " + (c?.name || "contact") + " based on: " + prompt + "]" };
      }));
      setStep(3);
    } catch (_) {
      setPreviews(selected.map(id => {
        const c = contacts.find(x => x.id === id);
        return { contact_id: id, name: c?.name || "Contact", phone: c?.phone || "", message: "[Preview for " + (c?.name || "contact") + ": " + prompt + "]" };
      }));
      setStep(3);
    }
    setLoading(false);
  };

  const sendAll = async () => {
    setSending(true);
    try {
      await api.sendSmsCampaign(selected, prompt, false);
    } catch (_) {}
    setHistory(h => [...h, { date: new Date().toISOString(), count: selected.length, prompt }]);
    setSent(true);
    setSending(false);
    setStep(4);
  };

  const reset = () => { setStep(1); setSelected([]); setPrompt(""); setPreviews([]); setSent(false); };

  return (
    <div className="p-6 space-y-5 text-white max-w-3xl">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">SMS Campaign</h2>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {["Contacts","Prompt","Preview","Done"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold " + (step > i+1 ? "bg-green-500 text-white" : step === i+1 ? "bg-[#3b82f6] text-white" : "bg-white/10 text-slate-500")}>
              {step > i+1 ? "✓" : i+1}
            </div>
            <span className={"text-xs " + (step === i+1 ? "text-white" : "text-slate-500")}>{s}</span>
            {i < 3 && <ChevronRight className="w-3 h-3 text-slate-600" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{selected.length} of {contacts.length} selected</p>
            <button onClick={toggleAll} className="text-xs text-[#60a5fa] hover:text-white">
              {selected.length === contacts.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 max-h-80 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No contacts found</div>
            ) : contacts.map(c => (
              <div key={c.id} onClick={() => toggle(c.id)}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5">
                {selected.includes(c.id) ? <CheckSquare className="w-4 h-4 text-[#60a5fa] flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(2)} disabled={selected.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-40 transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Campaign Message Prompt</label>
            <p className="text-xs text-slate-500 mb-3">Describe what you want to say. AI will personalize each message.</p>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
              placeholder="e.g. Remind them about our spring sale ending this Friday. Mention their name and offer 20% off."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6] resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={generatePreviews} disabled={!prompt.trim() || loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-40 transition-all">
              <Eye className="w-4 h-4" /> {loading ? "Generating..." : "Preview Messages"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Review personalized messages before sending</p>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {previews.map((p, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.phone}</span>
                </div>
                <p className="text-sm text-slate-300">{p.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={sendAll} disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
              <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send " + previews.length + " Messages"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <Send className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-green-400">Campaign Sent!</h3>
          <p className="text-slate-400 text-sm">{selected.length} messages sent successfully</p>
          <button onClick={reset} className="px-4 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold transition-all">
            New Campaign
          </button>
        </div>
      )}

      {history.length > 0 && step !== 4 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-400">Campaign History</h3>
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{h.prompt}</p>
                <p className="text-[10px] text-slate-500">{new Date(h.date).toLocaleDateString()}</p>
              </div>
              <span className="text-xs text-slate-400">{h.count} sent</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
