import { useState, useEffect } from "react";
import { Video, Plus, X, Copy, Calendar, Link, Trash2 } from "lucide-react";
import api from "@/api/inboxAiClient";

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function MeetingScheduler() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", duration: "30", room: "", phone: "" });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [onVideo, setOnVideo] = useState(null);

  const load = () => {
    api.getMeetings()
      .then(d => setMeetings(Array.isArray(d) ? d : []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title || !form.date) return;
    setCreating(true);
    const room = form.room || form.title.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    try {
      const m = await api.createMeeting({ ...form, room_name: room });
      if (form.phone) {
        const link = "https://meet.jit.si/" + room;
        await api.sendSms(form.phone, "You are invited to: " + form.title + ". Join here: " + link).catch(() => {});
      }
      setMeetings(ms => [m || { ...form, id: Date.now(), room_name: room }, ...ms]);
      setShowCreate(false);
      setForm({ title: "", date: "", time: "", duration: "30", room: "", phone: "" });
    } catch (_) {
      setMeetings(ms => [{ ...form, id: Date.now(), room_name: room, title: form.title }, ...ms]);
      setShowCreate(false);
      setForm({ title: "", date: "", time: "", duration: "30", room: "", phone: "" });
    }
    setCreating(false);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const now = new Date();
  const upcoming = meetings.filter(m => new Date(m.date || m.scheduled_at || m.created_at || 0) >= now);
  const past = meetings.filter(m => new Date(m.date || m.scheduled_at || m.created_at || 0) < now);

  return (
    <div className="p-6 space-y-5 text-white">
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">Meetings</h2>
        <button onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-2 px-3 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> New Meeting
        </button>
      </div>

      {showCreate && (
        <div className="bg-white/5 rounded-xl p-5 border border-[#3b82f6]/40 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Schedule Meeting</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Meeting title" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]">
              {["15","30","45","60","90","120"].map(d => <option key={d} value={d} className="bg-[#1e1e30]">{d} minutes</option>)}
            </select>
            <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
              placeholder="Room name (auto)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
          </div>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="SMS invite to phone (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
          <button onClick={create} disabled={creating || !form.title || !form.date}
            className="w-full py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-40 transition-all">
            {creating ? "Creating..." : "Create Meeting"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Loading meetings...</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">Upcoming ({upcoming.length})</h3>
              {upcoming.map((m, i) => {
                const link = "https://meet.jit.si/" + (m.room_name || m.id);
                return (
                  <div key={m.id || i} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
                      <Video className="w-5 h-5 text-[#60a5fa]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{m.title || m.room_name}</p>
                      <p className="text-xs text-slate-400">{fmtDate(m.date || m.scheduled_at)} · {m.duration || 30} min</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copy(link, m.id + "copy")} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs flex items-center gap-1 transition-all">
                        <Copy className="w-3 h-3" /> {copied === m.id + "copy" ? "Copied!" : "Copy"}
                      </button>
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-xs font-semibold flex items-center gap-1 transition-all">
                        <Link className="w-3 h-3" /> Join
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-500">Past Meetings</h3>
              {past.slice(0,5).map((m, i) => (
                <div key={m.id || i} className="bg-white/3 rounded-xl p-3 border border-white/5 flex items-center gap-4">
                  <Video className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-400">{m.title || m.room_name}</p>
                    <p className="text-xs text-slate-600">{fmtDate(m.date || m.scheduled_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {meetings.length === 0 && (
            <div className="bg-white/5 rounded-xl p-10 border border-white/10 text-center text-slate-500">
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No meetings yet. Schedule your first one!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
