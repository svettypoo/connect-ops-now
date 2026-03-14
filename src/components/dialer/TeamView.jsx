import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Edit2, Trash2, UserPlus, X, Search, Users } from 'lucide-react';
import api from '@/api/inboxAiClient';

const STATUS_COLORS = {
  available: '#22c55e',
  busy: '#f59e0b',
  dnd: '#ef4444',
  offline: '#6b7280',
};

const STATUS_LABELS = {
  available: 'Available',
  busy: 'Busy',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

export default function TeamView() {
  const [members, setMembers] = useState([]);
  const [myStatus, setMyStatus] = useState('available');
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    try {
      const usersRes = await api.getAdminUsers();
      const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
      setMembers(users.map(u => ({
        ...u,
        status: u.presence || 'offline',
      })));
    } catch (e) {
      console.error('TeamView load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const changeMyStatus = async (status) => {
    setStatusSaving(true);
    setMyStatus(status);
    try { await api.setPresence(status); } catch {}
    setStatusSaving(false);
  };

  const inviteUser = async () => {
    if (!inviteEmail || !inviteName) return;
    try {
      await api.inviteUser(inviteEmail, inviteName);
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      load();
    } catch (e) {
      alert(e.message || 'Failed to invite user');
    }
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
      });
      setEditingUser(null);
      load();
    } catch (e) {
      alert(e.message || 'Failed to update user');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (e) {
      alert(e.message || 'Failed to delete user');
    }
  };

  // Filter by search
  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
  });

  const onlineMembers = filteredMembers.filter(m => m.status !== 'offline');
  const offlineMembers = filteredMembers.filter(m => m.status === 'offline');

  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6">
      {/* My Status */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white text-xs font-semibold uppercase tracking-wider opacity-70 mb-4">My Status</h3>
        <div className="flex gap-2.5 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => changeMyStatus(key)}
              disabled={statusSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border-2 ${
                myStatus === key
                  ? 'border-current bg-current/10'
                  : 'border-white/10 bg-transparent text-white/50 hover:border-white/20'
              }`}
              style={myStatus === key ? { color: STATUS_COLORS[key], borderColor: STATUS_COLORS[key], background: STATUS_COLORS[key] + '22' } : undefined}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[key] }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Team header + search + invite */}
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-[#60a5fa]" />
        <h2 className="text-xl font-bold text-white">Team</h2>
        <span className="text-slate-500 text-sm">
          {onlineMembers.length} online · {members.length} total
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent text-sm text-white placeholder-slate-600 outline-none w-24"
            />
          </div>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 text-[#60a5fa] text-xs font-semibold transition-all">
            <UserPlus className="w-3.5 h-3.5" /> Invite
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-10">Loading team...</div>
      ) : members.length === 0 ? (
        <div className="text-white/40 text-center py-10">No team members yet</div>
      ) : (
        <>
          {onlineMembers.length > 0 && (
            <div className="space-y-2">
              {onlineMembers.map(member => (
                <MemberCard key={member.id} member={member} onEdit={setEditingUser} onDelete={deleteUser} />
              ))}
            </div>
          )}
          {offlineMembers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white/30 text-xs font-semibold uppercase tracking-wider">
                Offline — {offlineMembers.length}
              </h4>
              {offlineMembers.map(member => (
                <MemberCard key={member.id} member={member} dimmed onEdit={setEditingUser} onDelete={deleteUser} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowInvite(false)}>
          <div className="bg-[#1a1f35] rounded-2xl border border-white/10 p-6 w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#3b82f6]/50" />
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email address" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#3b82f6]/50" />
              <button onClick={inviteUser} disabled={!inviteEmail || !inviteName}
                className="w-full py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm transition-all disabled:opacity-40">
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingUser(null)}>
          <div className="bg-[#1a1f35] rounded-2xl border border-white/10 p-6 w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Edit Team Member</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#3b82f6]/50" />
              <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-[#3b82f6]/50" />
              {editingUser.phone_number && (
                <div className="bg-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-400">
                  Phone: {editingUser.phone_number}
                </div>
              )}
              {editingUser.sip_user && (
                <div className="bg-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-400">
                  Extension: {editingUser.sip_user}
                </div>
              )}
              <button onClick={saveEdit}
                className="w-full py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-sm transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, dimmed, onEdit, onDelete }) {
  const initials = (member.name || member.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarHue = (member.name || member.email || '').charCodeAt(0) * 7 % 360;

  return (
    <div className={`flex items-center gap-3.5 p-4 rounded-xl bg-white/[0.04] border border-white/[0.07] transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: `hsl(${avatarHue}, 50%, 35%)` }}>
          {initials}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#12172a]"
          style={{ background: STATUS_COLORS[member.status] || STATUS_COLORS.offline }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">{member.name || member.email}</div>
        <div className="text-white/40 text-xs">{member.email}</div>
        {member.phone_number && (
          <div className="text-white/30 text-[11px] mt-0.5 flex items-center gap-1">
            <Phone className="w-2.5 h-2.5" /> {member.phone_number}
            {member.sip_user && <span className="text-white/20">· ext {member.sip_user}</span>}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium"
        style={{ background: (STATUS_COLORS[member.status] || STATUS_COLORS.offline) + '22', color: STATUS_COLORS[member.status] || STATUS_COLORS.offline }}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {STATUS_LABELS[member.status] || 'Offline'}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(member)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all" title="Edit">
          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <button onClick={() => onDelete(member.id)}
          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all" title="Remove">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}
