import { useState, useRef, useEffect } from "react";
import { Send, Languages, Loader2, ArrowLeft, Lightbulb } from "lucide-react";
import api from "@/api/inboxAiClient";

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m ago";
  if (diff < 86400000) return Math.round(diff/3600000) + "h ago";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

export default function Messaging({ initialThread }) {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(initialThread || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getSmsThreads()
      .then(t => setThreads(Array.isArray(t) ? t : []))
      .catch(() => setThreads([]))
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    if (activeThread) loadMessages(activeThread.from_number || activeThread.number);
  }, [activeThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMessages = async (number) => {
    try {
      const msgs = await api.getSmsThread(number);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch { setMessages([]); }
  };

  const openThread = (t) => {
    setActiveThread(t);
    api.markThreadRead(t.from_number || t.number).catch(() => {});
    setThreads(prev => prev.map(x => (x.id === t.id ? { ...x, unread: 0 } : x)));
    setSuggestions([]);
  };

  const loadSuggestions = async () => {
    setLoadingSugg(true);
    try {
      const sugg = await api.getSmsReplySuggestions(activeThread.from_number || activeThread.number);
      setSuggestions(Array.isArray(sugg) ? sugg : []);
    } catch { setSuggestions([]); }
    setLoadingSugg(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeThread || sending) return;
    setSending(true);
    const to = activeThread.from_number || activeThread.number;
    const tempMsg = { id: "t" + Date.now(), direction: "outbound", body: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setInput("");

    try {
      await api.sendSms(to, text);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setInput(text);
    }
    setSending(false);
    setSuggestions([]);
  };

  const startNewThread = async () => {
    const num = newNumber.trim();
    if (!num) return;
    const t = { id: num, from_number: num, contact_name: num, last_message: "", unread: 0 };
    setActiveThread(t);
    setMessages([]);
    setShowNew(false);
    setNewNumber("");
  };

  if (activeThread) {
    const name = activeThread.contact_name || activeThread.name || activeThread.from_number || activeThread.number || "Unknown";
    return (
      <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5 flex flex-col" style={{ height: 500 }}>
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <button onClick={() => { setActiveThread(null); setMessages([]); setSuggestions([]); }}
            className="p-1 rounded-lg hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#0684BD] flex items-center justify-center text-xs font-bold text-white">
            {initials(name)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-slate-500">{activeThread.from_number || activeThread.number}</p>
          </div>
          <button onClick={loadSuggestions} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 transition-all">
            {loadingSugg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
            Suggest
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && <p className="text-slate-600 text-sm text-center py-8">No messages yet</p>}
          {messages.map((m, i) => {
            const out = m.direction === "outbound" || m.out;
            return (
              <div key={m.id || i} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${out ? "bg-[#0684BD] text-white" : "bg-slate-700/80 text-slate-100"}`}>
                  {m.body || m.text}
                  <div className={`text-xs mt-1 ${out ? "text-blue-200/70" : "text-slate-500"}`}>{fmtTime(m.created_at || m.time || Date.now())}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {suggestions.length > 0 && (
          <div className="px-3 py-2 border-t border-white/5 flex gap-2 overflow-x-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-white/5 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0EB8FF]/40" />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#0684BD] hover:bg-[#0EB8FF] disabled:opacity-40 flex items-center justify-center transition-all">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5 flex flex-col" style={{ height: 500 }}>
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-white">Messages</span>
        </div>
        <button onClick={() => setShowNew(p => !p)}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0684BD]/20 hover:bg-[#0684BD]/40 text-[#0EB8FF] transition-all text-lg font-bold">+</button>
      </div>

      {showNew && (
        <div className="px-4 py-3 border-b border-white/5 flex gap-2">
          <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="+1 (555) 000-0000"
            onKeyDown={e => e.key === "Enter" && startNewThread()}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none" />
          <button onClick={startNewThread} className="px-3 py-2 rounded-lg bg-[#0684BD] text-white text-xs font-semibold">New</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loadingThreads && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-600 border-t-[#0EB8FF] rounded-full animate-spin" /></div>}
        {!loadingThreads && threads.length === 0 && <p className="text-slate-600 text-sm text-center py-12">No conversations yet</p>}
        {threads.map(t => {
          const name = t.contact_name || t.name || t.from_number || t.number || "Unknown";
          return (
            <button key={t.id} onClick={() => openThread(t)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 border-l-2 border-transparent hover:border-[#0EB8FF] transition-all">
              <div className="w-9 h-9 rounded-full bg-[#0684BD] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {initials(name)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{name}</span>
                  {t.last_message_at && <span className="text-[10px] text-slate-600">{fmtTime(t.last_message_at)}</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">{t.last_message || t.lastMsg || ""}</p>
              </div>
              {t.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#0684BD] flex items-center justify-center text-[10px] font-bold text-white">{t.unread}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
