import { useState, useEffect, useRef } from "react";
import { Hash, Plus, X, Send, Paperclip, AtSign } from "lucide-react";
import api from "@/api/inboxAiClient";

function Avatar({ name, size = "sm" }) {
  const s = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
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
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderBody(body) {
  if (!body) return null;
  const parts = body.split(/(@\w+)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? <span key={i} className="text-blue-400 font-semibold bg-blue-500/10 rounded px-0.5">{p}</span> : p
  );
}

export default function ChannelsView() {
  const [channels, setChannels] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [users, setUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  const loadChannels = () => {
    api.getChannels()
      .then(d => {
        const list = Array.isArray(d) ? d : [
          { id: "general", name: "general", unread: 0 },
          { id: "sales", name: "sales", unread: 0 },
          { id: "support", name: "support", unread: 0 },
        ];
        setChannels(list);
        if (!active && list.length > 0) setActive(list[0]);
      })
      .catch(() => {
        const fallback = [
          { id: "general", name: "general", unread: 0 },
          { id: "sales", name: "sales", unread: 0 },
          { id: "support", name: "support", unread: 0 },
        ];
        setChannels(fallback);
        if (!active) setActive(fallback[0]);
      });
  };

  const loadMessages = (ch) => {
    if (!ch) return;
    api.getChannelMessages(ch.id)
      .then(d => {
        setMessages(Array.isArray(d) ? d : []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .catch(() => setMessages([]));
  };

  useEffect(() => {
    loadChannels();
    api.getAdminUsers().then(u => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(active), 5000);
    return () => clearInterval(pollRef.current);
  }, [active]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0 && (atIdx === 0 || val[atIdx-1] === ' ')) {
      setMentionFilter(val.slice(atIdx + 1).split(' ')[0].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name) => {
    const atIdx = text.lastIndexOf('@');
    const newText = text.slice(0, atIdx) + '@' + name + ' ';
    setText(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredUsers = users.filter(u => (u.name || u.email).toLowerCase().includes(mentionFilter));

  const send = async (attachmentUrl) => {
    if (!text.trim() && !attachmentUrl) return;
    if (!active || sending) return;
    setSending(true);
    const optimistic = { id: Date.now(), sender_name: "You", body: text, attachment_url: attachmentUrl, created_at: new Date().toISOString() };
    setMessages(m => [...m, optimistic]);
    const t = text;
    setText("");
    setShowMentions(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      await api.sendChannelMessageWithAttachment(active.id, t, attachmentUrl);
    } catch (_) {
      try { await api.sendChannelMessage(active.id, t); } catch (_) {}
    }
    setSending(false);
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

  const createChannel = async () => {
    if (!newName.trim()) return;
    try {
      await api.createChannel({ name: newName.trim() });
      setNewName(""); setShowCreate(false);
      loadChannels();
    } catch (_) {}
  };

  return (
    <div className="flex h-full text-white overflow-hidden rounded-xl border border-white/10">
      {/* Sidebar */}
      <div className="w-52 bg-[#141428] border-r border-white/5 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channels</span>
          <button onClick={() => setShowCreate(true)} className="text-slate-500 hover:text-[#0EB8FF]">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showCreate && (
          <div className="px-3 py-2 border-b border-white/5 space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="channel-name" onKeyDown={e => e.key === "Enter" && createChannel()}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[#0684BD]" />
            <div className="flex gap-1">
              <button onClick={createChannel} className="flex-1 py-1 bg-[#0684BD] rounded text-xs">Create</button>
              <button onClick={() => setShowCreate(false)} className="px-2 py-1 bg-white/5 rounded text-xs"><X className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActive(ch)}
              className={"w-full text-left px-3 py-2 flex items-center gap-2 transition-all " + (active?.id === ch.id ? "bg-[#0684BD]/20 text-[#0EB8FF]" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
              <Hash className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">{ch.name}</span>
              {ch.unread > 0 && (
                <span className="ml-auto w-4 h-4 rounded-full bg-[#0684BD] flex items-center justify-center text-[9px] font-bold">{ch.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-[#181830] overflow-hidden">
        {active ? (
          <>
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <span className="font-semibold">{active.name}</span>
              <span className="ml-auto text-xs text-slate-600">Use @name to mention someone</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-12">No messages yet. Say hi!</div>
              )}
              {messages.map((m, i) => {
                const showHeader = i === 0 || messages[i-1].sender_name !== m.sender_name;
                return (
                  <div key={m.id || i} className="flex gap-3">
                    {showHeader ? <Avatar name={m.sender_name} /> : <div className="w-7 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      {showHeader && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold">{m.sender_name || "Unknown"}</span>
                          <span className="text-[10px] text-slate-500">{fmt(m.created_at)}</span>
                        </div>
                      )}
                      {m.body && <p className="text-sm text-slate-300 break-words">{renderBody(m.body)}</p>}
                      {m.attachment_url && m.attachment_url.startsWith('data:image') && (
                        <img src={m.attachment_url} alt="attachment" className="mt-1 max-w-xs rounded-xl" />
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

            {/* @mention autocomplete */}
            {showMentions && filteredUsers.length > 0 && (
              <div className="mx-4 mb-1 bg-[#1e1e3a] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {filteredUsers.slice(0, 5).map(u => (
                  <button key={u.id} onClick={() => insertMention(u.name || u.email.split('@')[0])}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 transition-all">
                    <Avatar name={u.name} />
                    <span className="text-sm text-slate-300">{u.name || u.email}</span>
                    <AtSign className="w-3 h-3 text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-white/5">
              <div className="flex gap-2 items-end">
                <button onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0" title="Attach image">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <input ref={inputRef} value={text} onChange={handleTextChange}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === "Escape") setShowMentions(false); }}
                  placeholder={"Message #" + active.name + " (type @ to mention)"}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0684BD] resize-none" />
                <button onClick={() => send()} disabled={!text.trim() || sending}
                  className="px-3 py-2 bg-[#0684BD] hover:bg-[#0EB8FF] rounded-lg disabled:opacity-40 transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Hash className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a channel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
