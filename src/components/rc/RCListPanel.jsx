import { useState, useEffect } from "react";
import { Search, Plus, Star, PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2 } from "lucide-react";
import api from "@/api/inboxAiClient";

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts), diff = Date.now() - d;
  if (diff < 3600000) return Math.round(diff/60000) + "m";
  if (diff < 86400000) return Math.round(diff/3600000) + "h";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

const SECTION_META = {
  message: { title: "Messages", ph: "Search messages…" },
  recent: { title: "Recent Calls", ph: "Search calls…" },
  dialpad: { title: "Dialpad", ph: "Quick dial…" },
  voicemail: { title: "Voicemail", ph: "Search voicemails…" },
  video: { title: "Video", ph: "Search meetings…" },
  contacts: { title: "Contacts", ph: "Search contacts…" },
};

export default function RCListPanel({ activeNav, selectedContact, setSelectedContact }) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { title, ph } = SECTION_META[activeNav] || SECTION_META.message;

  useEffect(() => {
    setSearch("");
    loadData();
  }, [activeNav]);

  const loadData = async () => {
    setLoading(true);
    setItems([]);
    try {
      if (activeNav === "message") {
        const d = await api.getSmsThreads();
        setItems(Array.isArray(d) ? d.map(t => ({
          id: t.id, name: t.contact_name || t.from_number || "?",
          sub: t.last_message || "", time: t.last_message_at, unread: t.unread || 0,
          status: "active", _raw: t,
        })) : []);
      } else if (activeNav === "recent") {
        const d = await api.getCallLogs();
        setItems(Array.isArray(d) ? d.slice(0, 50).map(l => {
          const name = (l.direction==="inbound" ? l.from_name : l.to_name) || (l.direction==="inbound" ? l.from_number : l.to_number) || "?";
          return { id: l.id, name, sub: l.status === "missed" ? "Missed" : l.direction, time: l.started_at, status: l.status, _raw: l };
        }) : []);
      } else if (activeNav === "contacts") {
        const d = await api.getContacts();
        setItems(Array.isArray(d) ? d.map(c => ({
          id: c.id, name: c.name || c.phone, sub: c.phone, status: "offline", _raw: c,
        })) : []);
      } else if (activeNav === "voicemail") {
        const d = await api.getVoicemails();
        setItems(Array.isArray(d) ? d.map(v => ({
          id: v.id, name: v.contact_name || v.from_number || "?",
          sub: v.transcript?.slice(0,60) || "", time: v.created_at,
          unread: v.is_read ? 0 : 1, status: "offline", _raw: v,
        })) : []);
      } else if (activeNav === "video") {
        const d = await api.getMeetings();
        setItems(Array.isArray(d) ? d.map(m => ({
          id: m.id, name: m.title || "Meeting", sub: m.join_code, time: m.scheduled_at, status: "active", _raw: m,
        })) : []);
      }
    } catch { setItems([]); }
    setLoading(false);
  };

  const filtered = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || (it.sub||"").toLowerCase().includes(search.toLowerCase()));

  const STATUS_DOT = { active: "bg-green-400", away: "bg-yellow-400", offline: "bg-slate-600", missed: "bg-red-400" };

  return (
    <div className="w-[260px] flex flex-col bg-[#181830] border-r border-white/5">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px] text-white">{title}</h2>
          <div className="flex gap-1">
            {activeNav === 'contacts' && (
              <button onClick={() => {
                const name = prompt('Contact name:'); if (!name) return;
                const phone = prompt('Phone number:'); if (!phone) return;
                api.createContact({ name, phone }).then(loadData).catch(() => alert('Failed to create contact'));
              }} className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-500/20 hover:bg-green-500/40 text-green-400 transition-all text-lg font-bold" title="Add contact">+</button>
            )}
            <button onClick={loadData} className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0684BD]/20 hover:bg-[#0684BD]/40 text-[#0EB8FF] transition-all text-lg font-bold">↻</button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ph}
            className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-full" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-500 animate-spin" /></div>}
        {!loading && filtered.length === 0 && activeNav !== "dialpad" && (
          <p className="text-slate-600 text-xs text-center py-8">Nothing here yet</p>
        )}
        {activeNav === "dialpad" && (
          <p className="text-slate-600 text-xs text-center py-8">Use the dialpad to place a call</p>
        )}
        {filtered.map(item => (
          <button key={item.id} onClick={() => setSelectedContact({ ...item._raw, name: item.name, status: item.status || "offline" })}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
              selectedContact?.id === item.id ? "bg-white/8 border-l-2 border-[#0EB8FF]" : "hover:bg-white/4 border-l-2 border-transparent"
            }`}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                {initials(item.name)}
              </div>
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#181830] ${STATUS_DOT[item.status] || "bg-slate-600"}`} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium truncate ${item.status === "missed" ? "text-red-400" : "text-white"}`}>{item.name}</span>
                <span className="text-[10px] text-slate-600 ml-1 flex-shrink-0">{fmtTime(item.time)}</span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{item.sub}</p>
            </div>
            {item.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-[#0684BD] flex items-center justify-center text-[10px] font-bold text-white">{item.unread}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
