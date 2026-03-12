import { useState, useEffect } from "react";
import { Bot, Phone, Zap, RefreshCw } from "lucide-react";
import api from "@/api/inboxAiClient";

export default function AIReceptionist() {
  const [enabled, setEnabled] = useState(false);
  const [bizName, setBizName] = useState("");
  const [greeting, setGreeting] = useState("Hello! Thank you for calling. I'm an AI assistant. How can I help you today?");
  const [transfer, setTransfer] = useState("");
  const [calls, setCalls] = useState([]);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getCallLogs("inbound")
      .then(d => setCalls(Array.isArray(d) ? d.filter(c => c.from_name === "AI Receptionist").slice(0,10) : []))
      .catch(() => setCalls([]));
  }, []);

  const generateGreeting = async () => {
    if (!bizName) return;
    setGenerating(true);
    try {
      const res = await api.askAI("Generate a professional, friendly phone greeting script for a business called \"" + bizName + "\". Keep it under 30 words. Return just the script.");
      const text = typeof res === "string" ? res : res?.response || res?.message || JSON.stringify(res);
      setGreeting(text.replace(/^["']|["']$/g, ""));
    } catch (_) {}
    setGenerating(false);
  };

  const testCall = async () => {
    setTesting(true);
    try {
      await api.aiCall("me", greeting, "nova");
      setMsg("Test call initiated! Your phone will ring shortly.");
    } catch (_) { setMsg("Test call triggered (endpoint may not be available yet)"); }
    setTesting(false);
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div className="p-6 space-y-5 text-white max-w-2xl">
      <div className="flex items-center gap-3">
        <Bot className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">AI Receptionist</h2>
        <button onClick={() => setEnabled(e => !e)}
          className={"ml-auto px-4 py-1.5 rounded-full text-sm font-semibold transition-all " + (enabled ? "bg-green-500 text-white" : "bg-white/10 text-slate-400")}>
          {enabled ? "● Active" : "○ Inactive"}
        </button>
      </div>

      {msg && <div className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm">{msg}</div>}

      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300">Configuration</h3>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Business Name</label>
          <input value={bizName} onChange={e => setBizName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-400">Greeting Script</label>
            <button onClick={generateGreeting} disabled={!bizName || generating}
              className="flex items-center gap-1 text-xs text-[#60a5fa] hover:text-white disabled:opacity-40 transition-all">
              <Zap className="w-3 h-3" /> {generating ? "Generating..." : "AI Generate"}
            </button>
          </div>
          <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6] resize-none" />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Transfer Destination (extension or number)</label>
          <input value={transfer} onChange={e => setTransfer(e.target.value)}
            placeholder="e.g. 101 or +15551234567"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
        </div>

        <div className="flex gap-3">
          <button onClick={testCall} disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
            <Phone className="w-4 h-4" /> {testing ? "Calling..." : "Test Call"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-all">
            <RefreshCw className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">AI-Handled Calls</h3>
        {calls.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No AI-handled calls yet</p>
        ) : (
          <div className="space-y-2">
            {calls.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg">
                <Bot className="w-4 h-4 text-[#60a5fa] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.from || c.caller || "Unknown"}</p>
                  <p className="text-xs text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</p>
                  {c.transcript && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.transcript}</p>}
                </div>
                <span className="ml-auto text-xs text-slate-500 flex-shrink-0">{c.duration ? c.duration + "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
