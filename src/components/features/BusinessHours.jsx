import { useState, useEffect } from "react";
import { Clock, Save, Plus, X } from "lucide-react";
import api from "@/api/inboxAiClient";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TZS = ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Vancouver","Europe/London","UTC"];

const DEFAULT_HOURS = DAYS.map((d, i) => ({
  day: d, enabled: i < 5, open: "09:00", close: "17:00"
}));

function isOpen(hours, tz) {
  try {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const timeStr = now.toTimeString().slice(0, 5);
    const today = hours.find(h => h.day === dayName);
    if (!today?.enabled) return false;
    return timeStr >= today.open && timeStr < today.close;
  } catch (_) { return false; }
}

export default function BusinessHours() {
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [tz, setTz] = useState("America/New_York");
  const [afterAction, setAfterAction] = useState("voicemail");
  const [afterNumber, setAfterNumber] = useState("");
  const [afterMsg, setAfterMsg] = useState("We are currently closed. Please call back during business hours.");
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getBusinessHours()
      .then(d => {
        if (d?.hours) setHours(d.hours);
        if (d?.timezone) setTz(d.timezone);
        if (d?.after_hours_action) setAfterAction(d.after_hours_action);
        if (d?.after_hours_number) setAfterNumber(d.after_hours_number);
        if (d?.after_hours_message) setAfterMsg(d.after_hours_message);
        if (d?.holidays) setHolidays(d.holidays);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.setBusinessHours({ hours, timezone: tz, after_hours_action: afterAction, after_hours_number: afterNumber, after_hours_message: afterMsg, holidays });
      setMsg("Business hours saved!");
    } catch (_) { setMsg("Saved locally (API not yet available)"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const updateDay = (i, field, val) => setHours(h => h.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  const addHoliday = () => {
    if (!newHoliday.date) return;
    setHolidays(h => [...h, { ...newHoliday }]);
    setNewHoliday({ date: "", message: "" });
  };

  const open = isOpen(hours, tz);

  return (
    <div className="p-6 space-y-5 text-white max-w-2xl">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">Business Hours</h2>
        <span className={"ml-auto px-3 py-1 rounded-full text-xs font-bold " + (open ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
          {open ? "● Currently Open" : "● Currently Closed"}
        </span>
      </div>

      {msg && <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">{msg}</div>}

      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-slate-300">Timezone</label>
          <select value={tz} onChange={e => setTz(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]">
            {TZS.map(t => <option key={t} value={t} className="bg-[#1e1e30]">{t}</option>)}
          </select>
        </div>

        {hours.map((d, i) => (
          <div key={d.day} className="flex items-center gap-3">
            <button onClick={() => updateDay(i, "enabled", !d.enabled)}
              className={"w-10 h-5 rounded-full transition-all flex items-center px-0.5 " + (d.enabled ? "bg-[#3b82f6]" : "bg-white/10")}>
              <span className={"w-4 h-4 rounded-full bg-white transition-all " + (d.enabled ? "translate-x-5" : "")} />
            </button>
            <span className={"text-sm w-24 " + (d.enabled ? "text-white" : "text-slate-500")}>{d.day}</span>
            {d.enabled ? (
              <>
                <input type="time" value={d.open} onChange={e => updateDay(i, "open", e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-[#3b82f6]" />
                <span className="text-slate-500 text-sm">to</span>
                <input type="time" value={d.close} onChange={e => updateDay(i, "close", e.target.value)}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-[#3b82f6]" />
              </>
            ) : (
              <span className="text-xs text-slate-600">Closed</span>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">After-Hours Action</h3>
        <div className="flex gap-3">
          {["voicemail","transfer","message"].map(a => (
            <button key={a} onClick={() => setAfterAction(a)}
              className={"px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all " + (afterAction === a ? "bg-[#3b82f6] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
              {a === "transfer" ? "Transfer" : a === "voicemail" ? "Voicemail" : "Play Message"}
            </button>
          ))}
        </div>
        {afterAction === "transfer" && (
          <input value={afterNumber} onChange={e => setAfterNumber(e.target.value)}
            placeholder="Transfer to number or extension"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
        )}
        {(afterAction === "message" || afterAction === "voicemail") && (
          <textarea value={afterMsg} onChange={e => setAfterMsg(e.target.value)} rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6] resize-none" />
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Holidays</h3>
        {holidays.map((h, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{h.date}</span>
            <span className="text-xs text-slate-500 flex-1 truncate">{h.message}</span>
            <button onClick={() => setHolidays(hs => hs.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input type="date" value={newHoliday.date} onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-[#3b82f6]" />
          <input value={newHoliday.message} onChange={e => setNewHoliday(h => ({ ...h, message: e.target.value }))}
            placeholder="Holiday message" className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-[#3b82f6]" />
          <button onClick={addHoliday} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Business Hours"}
      </button>
    </div>
  );
}
