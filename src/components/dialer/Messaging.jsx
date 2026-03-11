import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Languages, Loader2, ArrowLeft, Lightbulb } from "lucide-react";
import api from "@/api/inboxAiClient";
import { playMessageSound } from "@/lib/useNotificationSettings";

function getNotifSettings() {
  try { const r = localStorage.getItem("con_notif_settings"); return r ? JSON.parse(r) : {}; } catch { return {}; }
}

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtTime(ts) {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m ago";
  if (diff < 86400000) return Math.round(diff/3600000) + "h ago";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

const EMOJI_LIST = ['😊','😂','👍','❤️','🙏','😍','🎉','💪','✅','🔥','👋','😢','🤔','💯','🚀'];

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
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgCountRef = useRef(0);
  const inputRef = useRef(null);

  const refreshThreads = useCallback(() => {
    api.getSmsThreads()
      .then(t => setThreads(Array.isArray(t) ? t : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.getSmsThreads()
      .then(t => setThreads(Array.isArray(t) ? t : []))
      .catch(() => setThreads([]))
      .finally(() => setLoadingThreads(false));
    const tid = setInterval(refreshThreads, 10000);
    return () => clearInterval(tid);
  }, [refreshThreads]);

  const loadMessages = useCallback(async (number, isPolling = false) => {
    try {
      const msgs = await api.getSmsThread(number);
      const arr = Array.isArray(msgs) ? msgs : [];
      if (isPolling) {
        const newInbound = arr.filter(m => m.direction === 'inbound').length;
        if (newInbound > lastMsgCountRef.current) {
          playMessageSound({ soundOnMessage: true, messageSound: 'chime', ringVolume: 80, vibrateOnMessage: true, ...getNotifSettings() });
        }
        lastMsgCountRef.current = newInbound;
      }
      setMessages(arr);
    } catch { setMessages([]); }
  }, []);

  useEffect(() => {
    if (!activeThread) { clearInterval(pollRef.current); return; }
    const number = activeThread.from_number || activeThread.number;
    lastMsgCountRef.current = 0;
    loadMessages(number);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(number, true), 5000);
    return () => clearInterval(pollRef.current);
  }, [activeThread, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
      setError(e.message || 'Failed to send message');
      setTimeout(() => setError(''), 4000);
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#17191C', position: 'relative' }}>
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

        {/* Error toast */}
        {error && (
          <div style={{ padding: '8px 16px', background: '#FF4444', color: '#fff', fontSize: '13px', flexShrink: 0 }}>{error}</div>
        )}
        {/* Emoji picker popover */}
        {showEmoji && (
          <div style={{ position: 'absolute', bottom: '64px', left: '16px', right: '16px', background: '#1E2025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px', zIndex: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {EMOJI_LIST.map(em => (
                <button key={em} onClick={() => { setInput(p => p + em); setShowEmoji(false); }}
                  style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '4px', lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >{em}</button>
              ))}
            </div>
          </div>
        )}
        {/* Input row */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #2A2D35', display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0, position: 'relative' }}>
          <button
            onClick={() => setShowEmoji(p => !p)}
            style={{
              flexShrink: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '10px', fontSize: '18px', background: showEmoji ? 'rgba(6,132,189,0.3)' : 'rgba(255,255,255,0.05)',
              border: 'none', cursor: 'pointer', color: showEmoji ? '#0EB8FF' : '#8B8F9B',
            }}
          >😊</button>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message…"
              rows={1}
              style={{
                width: '100%', background: '#1E2025', border: '1px solid #2A2D35', borderRadius: '18px',
                padding: '10px 40px 10px 16px', fontSize: '14px', color: '#FFFFFF', outline: 'none',
                resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
            {input.length > 0 && (
              <span style={{
                position: 'absolute', bottom: '10px', right: '10px', fontSize: '10px',
                color: input.length > 160 ? '#F44336' : '#555',
                pointerEvents: 'none',
              }}>
                {input.length}/160{input.length > 160 ? ` (+${Math.ceil(input.length/160)-1})` : ''}
              </span>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: '10px', background: '#0684BD',
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
