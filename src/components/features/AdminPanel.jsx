import { useState, useEffect } from "react";
import { Shield, Phone, Plus, X, Settings } from "lucide-react";
import api from "@/api/inboxAiClient";

export default function AdminPanel() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", name: "" });
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState("");
  const [transcriptionProvider, setTranscriptionProvider] = useState("browser");
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api.getAdminUsers()
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);

  useEffect(() => {
    if (tab === "settings") {
      api.getTranscriptionConfig()
        .then(d => { if (d?.provider) setTranscriptionProvider(d.provider); })
        .catch(() => {});
    }
  }, [tab]);

  const switchTranscription = async (provider) => {
    setTranscriptionLoading(true);
    try {
      await api.setTranscriptionConfig(provider);
      setTranscriptionProvider(provider);
      setMsg("Transcription switched to " + (provider === "deepgram" ? "Deepgram (all browsers)" : "Browser (Chrome only)"));
    } catch (e) { setMsg("Error: " + e.message); }
    setTranscriptionLoading(false);
  };

  const invite = async () => {
    if (!form.email || !form.name) return;
    setInviting(true);
    try {
      await api.inviteUser(form.email, form.name);
      setMsg("Invite sent to " + form.email);
      setShowInvite(false);
      setForm({ email: "", name: "" });
      loadUsers();
    } catch (e) { setMsg("Error: " + e.message); }
    setInviting(false);
  };

  return (
    <div className="p-6 space-y-4 text-white">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold">Admin Panel</h2>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
        {["users","numbers","roles","settings"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all " + (tab === t ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-white")}>
            {t === "numbers" ? "Phone Numbers" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {msg && (
        <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm flex justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{users.length} user{users.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold transition-all">
              <Plus className="w-4 h-4" /> Invite User
            </button>
          </div>

          {showInvite && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">Invite New User</h3>
                <button onClick={() => setShowInvite(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email address" type="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
              <button onClick={invite} disabled={inviting}
                className="w-full py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
                {inviting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Loading users...</div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-white/10">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Extension</th>
                    <th className="text-left px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-500">No users found</td></tr>
                  ) : users.map((u, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{u.email}</td>
                      <td className="px-4 py-3 text-slate-400">{u.extension || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-[#3b82f6]/20 text-[#60a5fa]">{u.role || "agent"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "numbers" && (
        <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center text-slate-400">
          <Phone className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Phone number management coming soon</p>
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-3">
          {[
            { name: "Admin", perms: ["Full access", "Manage users", "View all calls", "Configure IVR"] },
            { name: "Supervisor", perms: ["Monitor calls", "View analytics", "Listen/whisper/barge", "View wallboard"] },
            { name: "Agent", perms: ["Make/receive calls", "Send SMS", "View own history", "Manage contacts"] }
          ].map(r => (
            <div key={r.name} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="font-semibold mb-2">{r.name}</h3>
              <div className="flex flex-wrap gap-2">
                {r.perms.map(p => (
                  <span key={p} className="px-2 py-1 bg-white/5 rounded text-xs text-slate-400">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-[#60a5fa]" />
              <h3 className="font-semibold text-sm">Transcription Service</h3>
            </div>
            <p className="text-slate-400 text-xs mb-3">
              Choose the engine used for live call transcription. Browser mode works only in Chrome. Deepgram works in all browsers with higher accuracy.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => switchTranscription("browser")}
                disabled={transcriptionLoading}
                className={"flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border " +
                  (transcriptionProvider === "browser"
                    ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                    : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20")}
              >
                Browser (Chrome only)
              </button>
              <button
                onClick={() => switchTranscription("deepgram")}
                disabled={transcriptionLoading}
                className={"flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border " +
                  (transcriptionProvider === "deepgram"
                    ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                    : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20")}
              >
                Deepgram (all browsers)
              </button>
            </div>
            {transcriptionLoading && (
              <p className="text-slate-500 text-xs mt-2">Switching...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
