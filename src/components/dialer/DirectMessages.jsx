import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Paperclip, Circle } from "lucide-react";
import api from "@/api/inboxAiClient";

const STATUS_COLORS = { available: '#22c55e', busy: '#f59e0b', dnd: '#ef4444', offline: '#6b7280' };

function Avatar({ name, size = "sm" }) {
  const s = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const colors = ["from-blue-400 to-blue-600","from-purple-400 to-purple-600","from-green-400 to-green-600","from-orange-400 to-orange-600","from-pink-400 to-pink-600"];
  const idx = (name || "U").charCodeAt(0) % colors.length;
  return (
    <div className={"rounded-full bg-gradient-to-br " + colors[idx] + " " + s + " flex items-center justify-center font-bold text-white flex-shrink-0"}>
      {(name || "U")[0].toUpperCase()}
    </div>
  );
}

function fmt(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = Date.now() - d;
  if (diff < 3600000) return Math.round(diff / 60000) + "m ago";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DirectMessages() {
  const [users, setUsers] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    api.me().then(u => setMyId(u.id)).catch(() => {});
    loadUsers();
  }, []);

  const loadUsers = () => {
    api.getDMUsers().then(d => {
      setUsers(Array.isArray(d) ? d : []);
    }).catch(() => {});
  };

  const loadMessages = (u) => {
    if (!u) return;
    api.getDMMessages(u.id).then(d => {
      setMessages(Array.isArray(d) ? d : []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }).catch(() => setMessages([]));
  };

  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(active), 4000);
    return () => clearInterval(pollRef.current);
  }, [active]);

  const send = async (attachmentUrl) => {
    if (!text.trim() && !attachmentUrl) return;
    if (!active || sending) return;
    setSending(true);
    const optimistic = { id: Date.now(), user_from_id: myId, sender_name: "You", body: text, attachment_url: attachmentUrl, created_at: new Date().toISOString() };
    setMessages(m => [...m, optimistic]);
    const t = text;
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      await api.sendDM(active.id, t, attachmentUrl);
    } catch (_) {}
    setSending(false);
    loadUsers();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Max file size: 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => send(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMention = (body) => {
    if (!body) return null;
    const parts = body.split(/(@\w+)/g);
    return parts.map((p, i) => p.startsWith('@')
      ? <span key={i} className="text-blue-400 font-semibold">{p}</span>
      : p
    );
  };

  return (
    <div className="flex h-full text-white overflow-hidden rounded-xl border border-white/10">
      {/* User list */}
      <div className="w-52 bg-[#141428] border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct Messages</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {users.length === 0 && (
            <div className="text-center text-slate-600 text-xs py-8 px-3">No other users yet</div>
          )}
          {users.map(u => (
            <button key={u.id} onClick={() => setActive(u)}
              className={"w-full text-left px-3 py-2 flex items-center gap-2.5 transition-all " + (active?.id === u.id ? "bg-[#0684BD]/20" : "hover:bg-white/5")}>
              <div className="relative flex-shrink-0">
                <Avatar name={u.name} />
                <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" fill={STATUS_COLORS[u.presence] || '#6b7280'} stroke="none" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={"text-sm truncate " + (active?.id === u.id ? "text-[#0EB8FF]" : "text-slate-300")}>{u.name || u.email}</p>
                {u.lastMessage && <p className="text-xs text-slate-600 truncate">{u.lastMessage}</p>}
              </div>
              {u.unread > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0684BD] flex items-center justify-center text-[9px] font-bold flex-shrink-0">{u.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Message pane */}
      <div className="flex-1 flex flex-col bg-[#181830] overflow-hidden">
        {active ? (
          <>
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
              <Avatar name={active.name} />
              <div>
                <p className="font-semibold text-sm">{active.name || active.email}</p>
                <p className="text-xs" style={{ color: STATUS_COLORS[active.presence] || '#6b7280' }}>{active.presence || 'offline'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-12">Start a conversation</div>
              )}
              {messages.map((m, i) => {
                const isMe = m.user_from_id === myId;
                const showHeader = i === 0 || messages[i-1].user_from_id !== m.user_from_id;
                return (
                  <div key={m.id || i} className={"flex gap-3 " + (isMe ? "flex-row-reverse" : "")}>
                    {showHeader && !isMe ? <Avatar name={m.sender_name} /> : <div className="w-8 flex-shrink-0" />}
                    <div className={"max-w-[70%] " + (isMe ? "items-end" : "items-start") + " flex flex-col gap-1"}>
                      {showHeader && (
                        <div className={"flex items-baseline gap-2 " + (isMe ? "flex-row-reverse" : "")}>
                          <span className="text-xs font-semibold text-slate-400">{isMe ? "You" : m.sender_name}</span>
                          <span className="text-[10px] text-slate-600">{fmt(m.created_at)}</span>
                        </div>
                      )}
                      {m.body && (
                        <div className={"px-3 py-2 rounded-2xl text-sm break-words " + (isMe ? "bg-[#0684BD] text-white rounded-tr-sm" : "bg-white/8 text-slate-200 rounded-tl-sm")}>
                          {renderMention(m.body)}
                        </div>
                      )}
                      {m.attachment_url && m.attachment_url.startsWith('data:image') && (
                        <img src={m.attachment_url} alt="attachment" className="max-w-48 rounded-xl" />
                      )}
                      {m.attachment_url && !m.attachment_url.startsWith('data:image') && (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline">View attachment</a>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-white/5">
              <div className="flex gap-2 items-end">
                <button onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder={"Message " + (active.name || active.email)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0684BD]" />
                <button onClick={() => send()} disabled={!text.trim() || sending}
                  className="p-2 bg-[#0684BD] hover:bg-[#0EB8FF] rounded-lg disabled:opacity-40 transition-all flex-shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select someone to message</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
