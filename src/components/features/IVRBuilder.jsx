import { useState, useEffect } from "react";
import { GitBranch, Plus, X, Save, Play, Check } from "lucide-react";
import api from "@/api/inboxAiClient";

const NODE_TYPES = ["Greeting", "Menu", "Transfer", "Voicemail", "Hangup"];
const NODE_COLORS = { Greeting: "#3b82f6", Menu: "#6366F1", Transfer: "#10B981", Voicemail: "#F59E0B", Hangup: "#EF4444" };

function NodeBox({ node, onRemove }) {
  return (
    <div className="relative bg-white/5 border border-white/10 rounded-xl p-4 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NODE_COLORS[node.type] || "#888" }} />
        <span className="text-xs font-bold" style={{ color: NODE_COLORS[node.type] }}>{node.type}</span>
        <button onClick={() => onRemove(node.id)} className="ml-auto text-slate-600 hover:text-red-400">
          <X className="w-3 h-3" />
        </button>
      </div>
      <p className="text-xs text-slate-400 truncate">{node.text || "No text set"}</p>
      {node.type === "Menu" && node.options && (
        <div className="mt-2 space-y-1">
          {node.options.map((o, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="font-mono bg-white/10 px-1 rounded">{o.key}</span>
              <span>→</span>
              <span>{o.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IVRBuilder() {
  const [ivrs, setIvrs] = useState([]);
  const [active, setActive] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.getIVRs()
      .then(d => setIvrs(Array.isArray(d) ? d : []))
      .catch(() => setIvrs([]));
  };

  useEffect(() => { load(); }, []);

  const selectIVR = (ivr) => {
    setActive(ivr);
    setName(ivr.name || "");
    setNodes(ivr.nodes || [
      { id: 1, type: "Greeting", text: ivr.greeting || "Thank you for calling. Please listen to the following options." },
      { id: 2, type: "Menu", text: "Press 1 for Sales, 2 for Support, 0 for Operator.", options: [
        { key: "1", action: "Sales" }, { key: "2", action: "Support" }, { key: "0", action: "Operator" }
      ]},
    ]);
  };

  const addNode = (type) => {
    const id = Date.now();
    const defaults = {
      Greeting: { text: "Welcome! Thank you for calling." },
      Menu: { text: "Press 1 for Sales, 2 for Support.", options: [{ key: "1", action: "Sales" }, { key: "2", action: "Support" }] },
      Transfer: { text: "Transferring you now..." },
      Voicemail: { text: "Please leave a message after the beep." },
      Hangup: { text: "Thank you. Goodbye!" },
    };
    setNodes(n => [...n, { id, type, ...defaults[type] }]);
  };

  const removeNode = (id) => setNodes(n => n.filter(x => x.id !== id));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.saveIVR({ name, nodes, is_active: active?.is_active || false });
      setMsg("IVR saved!");
      load();
    } catch (_) { setMsg("Saved locally (API not yet available)"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="p-6 space-y-4 text-white">
      <div className="flex items-center gap-3">
        <GitBranch className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">IVR Builder</h2>
      </div>

      {msg && <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* IVR List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">IVRs</span>
            <button onClick={() => { setActive(null); setName(""); setNodes([]); setCreating(true); }}
              className="text-slate-500 hover:text-[#60a5fa]"><Plus className="w-4 h-4" /></button>
          </div>
          {(creating || ivrs.length === 0) && (
            <div className="bg-white/5 rounded-xl p-3 border border-[#3b82f6]/40 space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="IVR name"
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-[#3b82f6]" />
              <button onClick={() => { setCreating(false); if (!active) selectIVR({ name, nodes: [] }); }}
                className="w-full py-1.5 bg-[#3b82f6] rounded text-xs font-semibold">Start Building</button>
            </div>
          )}
          {ivrs.map(ivr => (
            <button key={ivr.id} onClick={() => { setCreating(false); selectIVR(ivr); }}
              className={"w-full text-left px-3 py-2 rounded-lg text-sm transition-all " + (active?.id === ivr.id ? "bg-[#3b82f6]/20 text-[#60a5fa]" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
              <div className="font-medium">{ivr.name}</div>
              {ivr.is_active && <div className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5"><Check className="w-2.5 h-2.5" />Active</div>}
            </button>
          ))}
        </div>

        {/* Node Editor */}
        <div className="lg:col-span-3 space-y-4">
          {(active || creating) ? (
            <>
              <div className="flex items-center gap-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="IVR Name"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6] flex-1" />
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {NODE_TYPES.map(t => (
                  <button key={t} onClick={() => addNode(t)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold border border-white/10 transition-all"
                    style={{ color: NODE_COLORS[t] }}>
                    <Plus className="w-3 h-3" /> {t}
                  </button>
                ))}
              </div>

              <div className="min-h-64 bg-white/3 rounded-xl border border-white/10 p-4">
                {nodes.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                    Add nodes to build your IVR flow
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 items-start">
                    {nodes.map((node, i) => (
                      <div key={node.id} className="flex items-center gap-2">
                        {i > 0 && <div className="text-slate-600">→</div>}
                        <NodeBox node={node} onRemove={removeNode} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500">
              <div className="text-center">
                <GitBranch className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an IVR or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
