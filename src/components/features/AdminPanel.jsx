import { useState, useEffect } from "react";
import { Shield, Phone, Plus, X, Settings, Pencil, Trash2, Link, Unlink, RefreshCw, Share2 } from "lucide-react";
import api from "@/api/inboxAiClient";
import NumberMap from "./NumberMap";

export default function AdminPanel() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", name: "" });
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState("");
  const [transcriptionProvider, setTranscriptionProvider] = useState("deepgram");
  const [isChromeBrowser] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);

  // Phone lines state
  const [phoneLines, setPhoneLines] = useState([]);
  const [telnyxInfo, setTelnyxInfo] = useState({ numbers: [], connections: [], credentials: [] });
  const [phoneLinesLoading, setPhoneLinesLoading] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [lineForm, setLineForm] = useState({ user_id: "", phone_number: "", telnyx_cred_id: "", telnyx_sip_user: "" });
  const [assignLoading, setAssignLoading] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api.getAdminUsers()
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);

  const loadPhoneLines = async () => {
    setPhoneLinesLoading(true);
    try {
      const [lines, telnyx, allUsers] = await Promise.all([
        api.getPhoneLines(),
        api.getTelnyxNumbers(),
        api.getAdminUsers(),
      ]);
      setPhoneLines(Array.isArray(lines) ? lines : []);
      setTelnyxInfo(telnyx || { numbers: [], connections: [], credentials: [] });
      setUsers(Array.isArray(allUsers) ? allUsers : []);
    } catch (e) {
      setMsg("Error loading phone lines: " + e.message);
    }
    setPhoneLinesLoading(false);
  };

  useEffect(() => { if (tab === "numbers") loadPhoneLines(); }, [tab]);

  const handleAssignLine = async () => {
    if (!lineForm.user_id || !lineForm.phone_number) return;
    setAssignLoading(true);
    try {
      if (editingLine) {
        await api.updatePhoneLine(editingLine.id, lineForm);
        setMsg("Phone line updated");
      } else {
        await api.assignPhoneLine(lineForm);
        setMsg("Phone line assigned");
      }
      setShowAssign(false);
      setEditingLine(null);
      setLineForm({ user_id: "", phone_number: "", telnyx_cred_id: "", telnyx_sip_user: "" });
      loadPhoneLines();
    } catch (e) { setMsg("Error: " + e.message); }
    setAssignLoading(false);
  };

  const handleDeleteLine = async (id) => {
    try {
      await api.deletePhoneLine(id);
      setMsg("Phone line removed");
      loadPhoneLines();
    } catch (e) { setMsg("Error: " + e.message); }
  };

  const startEditLine = (line) => {
    setEditingLine(line);
    setLineForm({
      user_id: line.user_id,
      phone_number: line.phone_number || "",
      telnyx_cred_id: line.telnyx_cred_id || "",
      telnyx_sip_user: line.telnyx_sip_user || "",
    });
    setShowAssign(true);
  };

  // Users without a phone line assigned
  const unassignedUsers = users.filter(u => !phoneLines.find(l => l.user_id === u.id));

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
        {["users","numbers","map","roles","settings"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-1.5 " + (tab === t ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-white")}>
            {t === "map" && <Share2 className="w-3.5 h-3.5" />}
            {t === "numbers" ? "Phone Numbers" : t === "map" ? "Canvas Map" : t.charAt(0).toUpperCase() + t.slice(1)}
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
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              {phoneLines.length} line{phoneLines.length !== 1 ? "s" : ""} assigned
              {telnyxInfo.numbers?.length > 0 && ` · ${telnyxInfo.numbers.length} Telnyx number${telnyxInfo.numbers.length !== 1 ? "s" : ""}`}
            </p>
            <div className="flex gap-2">
              <button onClick={loadPhoneLines} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all" title="Refresh">
                <RefreshCw className={"w-4 h-4 " + (phoneLinesLoading ? "animate-spin" : "")} />
              </button>
              <button onClick={() => { setEditingLine(null); setLineForm({ user_id: "", phone_number: "", telnyx_cred_id: "", telnyx_sip_user: "" }); setShowAssign(true); }}
                className="flex items-center gap-2 px-3 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold transition-all">
                <Plus className="w-4 h-4" /> Assign Line
              </button>
            </div>
          </div>

          {showAssign && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">{editingLine ? "Edit Phone Line" : "Assign Phone Line"}</h3>
                <button onClick={() => { setShowAssign(false); setEditingLine(null); }}><X className="w-4 h-4 text-slate-400" /></button>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">User</label>
                <select value={lineForm.user_id} onChange={e => setLineForm(f => ({ ...f, user_id: e.target.value }))}
                  disabled={!!editingLine}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6] disabled:opacity-50">
                  <option value="">Select user...</option>
                  {(editingLine ? users : unassignedUsers).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Phone Number</label>
                <select value={lineForm.phone_number} onChange={e => setLineForm(f => ({ ...f, phone_number: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]">
                  <option value="">Select number...</option>
                  {telnyxInfo.numbers?.map(n => (
                    <option key={n.phone_number} value={n.phone_number}>
                      {n.phone_number} ({n.connection_name || "unassigned"})
                    </option>
                  ))}
                  <option value="custom">Enter custom number...</option>
                </select>
                {lineForm.phone_number === "custom" && (
                  <input placeholder="+1XXXXXXXXXX" onChange={e => setLineForm(f => ({ ...f, phone_number: e.target.value }))}
                    className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Telnyx Credential (SIP/WebRTC)</label>
                <select value={lineForm.telnyx_cred_id} onChange={e => {
                  const cred = telnyxInfo.credentials?.find(c => c.id === e.target.value);
                  setLineForm(f => ({ ...f, telnyx_cred_id: e.target.value, telnyx_sip_user: cred?.sip_username || f.telnyx_sip_user }));
                }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]">
                  <option value="">Auto (based on email prefix)</option>
                  {telnyxInfo.credentials?.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.sip_username?.substring(0, 20)} — {c.status} {c.resource_id ? `(${c.resource_id.replace("connection:", "").substring(0, 8)}...)` : "(unlinked)"}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={handleAssignLine} disabled={assignLoading || !lineForm.user_id || !lineForm.phone_number}
                className="w-full py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
                {assignLoading ? "Saving..." : editingLine ? "Update Line" : "Assign Line"}
              </button>
            </div>
          )}

          {phoneLinesLoading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Loading phone lines...</div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-white/10">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Phone Number</th>
                    <th className="text-left px-4 py-3">SIP User</th>
                    <th className="text-left px-4 py-3">Credential</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {phoneLines.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">No phone lines assigned</td></tr>
                  ) : phoneLines.map((line) => {
                    const cred = telnyxInfo.credentials?.find(c => c.id === line.telnyx_cred_id);
                    const isLinked = cred?.resource_id;
                    return (
                      <tr key={line.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="font-medium">{line.name || "—"}</div>
                          <div className="text-xs text-slate-500">{line.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[#60a5fa]">{line.phone_number || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                          {line.telnyx_sip_user ? line.telnyx_sip_user.substring(0, 16) + "..." : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {line.telnyx_cred_id ? (
                            <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs " + (isLinked ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                              {isLinked ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                              {isLinked ? "Linked" : "Unlinked"}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEditLine(line)}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-all" title="Edit">
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            <button onClick={() => handleDeleteLine(line.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all" title="Remove">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Telnyx Numbers Overview */}
          {telnyxInfo.numbers?.length > 0 && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#60a5fa]" /> Telnyx Numbers
              </h3>
              <div className="space-y-1">
                {telnyxInfo.numbers.map(n => {
                  const assigned = phoneLines.find(l => l.phone_number === n.phone_number);
                  return (
                    <div key={n.phone_number} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 text-sm">
                      <span className="font-mono">{n.phone_number}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{n.connection_name}</span>
                        {assigned ? (
                          <span className="text-xs text-green-400">→ {assigned.name || assigned.email}</span>
                        ) : (
                          <span className="text-xs text-slate-600">Unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "map" && <NumberMap />}

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
              {isChromeBrowser && (
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
              )}
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
