import { useState, useEffect } from "react";
import { History, MessageSquare, Phone, Voicemail, StickyNote, Loader } from "lucide-react";
import api from "@/api/inboxAiClient";

export default function ConversationContext({ number, onClose }) {
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!number) return;
    setLoading(true);
    api.getConversationContext(number)
      .then(d => setCtx(d || {}))
      .catch(() => setCtx({}))
      .finally(() => setLoading(false));
  }, [number]);

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(n => [...n, { text: note, at: new Date().toISOString() }]);
    setNote("");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
      <Loader className="w-4 h-4 animate-spin" /> Loading context...
    </div>
  );

  return (
    <div className="p-4 space-y-4 text-white text-sm">
      <div className="flex items-center gap-2 mb-1">
        <History className="w-4 h-4 text-[#0EB8FF]" />
        <span className="font-semibold">Caller Context</span>
        <span className="ml-2 text-slate-500 text-xs">{number}</span>
      </div>

      {ctx?.ai_brief && (
        <div className="bg-[#0684BD]/10 border border-[#0684BD]/30 rounded-xl p-3">
          <p className="text-xs font-semibold text-[#0EB8FF] mb-1">AI Brief</p>
          <p className="text-xs text-slate-300">{ctx.ai_brief}</p>
        </div>
      )}

      {!ctx?.ai_brief && !ctx?.calls?.length && !ctx?.sms?.length && (
        <div className="text-slate-500 text-xs text-center py-4">No previous history with this number</div>
      )}

      {ctx?.calls?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><Phone className="w-3 h-3" /> Past Calls ({ctx.calls.length})</p>
          <div className="space-y-1">
            {ctx.calls.slice(0,3).map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 rounded px-3 py-2">
                <span className="text-[10px] text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</span>
                <span className="flex-1 text-xs text-slate-300">{c.direction || ""} · {c.duration ? c.duration + "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ctx?.sms?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> SMS Threads ({ctx.sms.length})</p>
          <div className="space-y-1">
            {ctx.sms.slice(0,2).map((s, i) => (
              <div key={i} className="bg-white/5 rounded px-3 py-2">
                <p className="text-xs text-slate-300 truncate">{s.body}</p>
                <p className="text-[10px] text-slate-600">{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</p>
        {notes.map((n, i) => (
          <div key={i} className="bg-white/5 rounded px-3 py-2 mb-1">
            <p className="text-xs text-slate-300">{n.text}</p>
            <p className="text-[10px] text-slate-600">{new Date(n.at).toLocaleTimeString()}</p>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add note..."
            onKeyDown={e => e.key === "Enter" && addNote()}
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs outline-none focus:border-[#0684BD]" />
          <button onClick={addNote} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs">Add</button>
        </div>
      </div>
    </div>
  );
}
