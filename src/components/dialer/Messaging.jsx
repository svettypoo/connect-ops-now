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

const AVATAR_COLORS = ['#E53935','#8E24AA','#1E88E5','#00897B','#F4511E','#6D4C41','#3949AB','#039BE5'];
function avatarColor(name) { let h = 0; for (const c of (name||'?')) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }

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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#17191C' }}>
        {/* Thread header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2D35', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button
            onClick={() => { setActiveThread(null); setMessages([]); setSuggestions([]); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '8px' }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px', color: '#8B8F9B' }} />
          </button>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: avatarColor(name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: '#fff',
            }}>
              {initials(name)}
            </div>
            <div style={{
              position: 'absolute', bottom: '0px', right: '0px',
              width: '9px', height: '9px', borderRadius: '50%',
              background: '#4CAF50', border: '2px solid #17191C',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600, margin: 0 }}>{name}</p>
            <p style={{ color: '#8B8F9B', fontSize: '12px', margin: 0 }}>{activeThread.from_number || activeThread.number}</p>
          </div>
          <button
            onClick={loadSuggestions}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#8B8F9B', fontSize: '12px' }}
          >
            {loadingSugg ? <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" /> : <Lightbulb style={{ width: '12px', height: '12px' }} />}
            Suggest
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.length === 0 && <p style={{ color: '#8B8F9B', fontSize: '14px', textAlign: 'center', paddingTop: '32px' }}>No messages yet</p>}
          {messages.map((m, i) => {
            const out = m.direction === "outbound" || m.out;
            return (
              <div key={m.id || i} style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%', borderRadius: '18px', padding: '10px 14px', fontSize: '14px',
                  background: out ? '#0684BD' : '#2A2D35',
                  color: out ? '#FFFFFF' : '#E8E9EC',
                }}>
                  {m.body || m.text}
                  <div style={{ fontSize: '11px', marginTop: '4px', color: out ? 'rgba(255,255,255,0.6)' : '#8B8F9B' }}>
                    {fmtTime(m.created_at || m.time || Date.now())}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {suggestions.length > 0 && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid #2A2D35', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#C8CAD0', fontSize: '12px' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{ padding: '12px', borderTop: '1px solid #2A2D35', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            style={{
              flex: 1, background: '#1E2025', border: '1px solid #2A2D35', borderRadius: '22px',
              padding: '10px 16px', fontSize: '14px', color: '#FFFFFF', outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', background: '#0684BD',
              border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !sending ? 1 : 0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {sending ? <Loader2 style={{ width: '16px', height: '16px', color: '#fff' }} className="animate-spin" /> : <Send style={{ width: '16px', height: '16px', color: '#fff' }} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#17191C' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2D35', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Messages</span>
        </div>
        <button
          onClick={() => setShowNew(p => !p)}
          style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,132,189,0.2)', border: 'none', cursor: 'pointer', color: '#0EB8FF', fontSize: '18px', fontWeight: 700 }}
        >+</button>
      </div>

      {showNew && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2D35', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            placeholder="+1 (555) 000-0000"
            onKeyDown={e => e.key === "Enter" && startNewThread()}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#FFFFFF', outline: 'none' }}
          />
          <button onClick={startNewThread} style={{ padding: '8px 14px', borderRadius: '8px', background: '#0684BD', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>New</button>
        </div>
      )}

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingThreads && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #2A2D35', borderTopColor: '#0EB8FF', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {!loadingThreads && threads.length === 0 && (
          <p style={{ color: '#8B8F9B', fontSize: '14px', textAlign: 'center', paddingTop: '48px' }}>No conversations yet</p>
        )}
        {threads.map(t => {
          const name = t.contact_name || t.name || t.from_number || t.number || "Unknown";
          const bg = avatarColor(name);
          return (
            <button
              key={t.id}
              onClick={() => openThread(t)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid #2A2D35', cursor: 'pointer',
                minHeight: '68px', textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {/* Avatar with presence dot */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', fontWeight: 700, color: '#fff',
                }}>
                  {initials(name)}
                </div>
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#4CAF50', border: '2px solid #17191C',
                }} />
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{name}</span>
                  {t.last_message_at && <span style={{ fontSize: '12px', color: '#8B8F9B', flexShrink: 0 }}>{fmtTime(t.last_message_at)}</span>}
                </div>
                <p style={{ fontSize: '13px', color: '#8B8F9B', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.last_message || t.lastMsg || ""}</p>
              </div>
              {/* Unread badge */}
              {t.unread > 0 && (
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#0684BD', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{t.unread}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
