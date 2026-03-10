import { useState, useEffect } from "react";
import { Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/api/inboxAiClient";

export default function CallNotes({ sessionId, callType, durationMinutes, transcript }) {
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { generateNotes(); }, []);

  const generateNotes = async () => {
    setLoading(true);
    try {
      const transcriptContext = transcript?.length ? "\nTranscript:\n" + transcript.join("\n") : "";
      const res = await api.askAI(
        `Generate a professional post-call summary for a ${callType || "voice"} call lasting ~${durationMinutes || 1} minute(s).${transcriptContext}\nRespond with JSON: { "summary": "...", "key_points": ["..."], "action_items": ["..."] }`
      );
      const text = typeof res === "string" ? res : JSON.stringify(res);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { setNotes(JSON.parse(match[0])); } catch {}
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4 px-4 pb-4">
      <button onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#0EB8FF]" /> : <FileText className="w-4 h-4 text-[#0EB8FF]" />}
        <span className="font-medium">{loading ? "Generating AI call notes…" : "AI Call Notes"}</span>
        {!loading && (expanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />)}
      </button>
      {!loading && expanded && notes && (
        <div className="mt-3 space-y-3 text-sm">
          {notes.summary && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Summary</p>
              <p className="text-slate-200">{notes.summary}</p>
            </div>
          )}
          {notes.key_points?.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Key Points</p>
              {notes.key_points.map((pt, i) => (
                <p key={i} className="text-slate-200 flex gap-2"><span className="text-[#0EB8FF]">•</span>{pt}</p>
              ))}
            </div>
          )}
          {notes.action_items?.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Action Items</p>
              {notes.action_items.map((it, i) => (
                <p key={i} className="text-slate-200 flex gap-2"><span className="text-green-400">✓</span>{it}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
