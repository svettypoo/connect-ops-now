import { useState, useEffect } from 'react';
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

  const load = async () => {
    try {
      const [usersRes, presenceRes] = await Promise.all([
        api.getAdminUsers(),
        api.getPresence(),
      ]);
      const users = usersRes.users || [];
      const presenceMap = {};
      if (Array.isArray(presenceRes)) {
        presenceRes.forEach(p => { presenceMap[p.user_id] = p.status; });
      } else if (presenceRes && presenceRes.status) {
        setMyStatus(presenceRes.status);
      }
      setMembers(users.map(u => ({
        ...u,
        status: presenceMap[u.id] || 'offline',
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
    try {
      await api.setPresence(status);
    } catch (e) {
      console.error('setPresence error', e);
    } finally {
      setStatusSaving(false);
    }
  };

  const onlineMembers = members.filter(m => m.status !== 'offline');
  const offlineMembers = members.filter(m => m.status === 'offline');

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* My Status */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: '14px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Status</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => changeMyStatus(key)}
              disabled={statusSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: myStatus === key ? `2px solid ${STATUS_COLORS[key]}` : '2px solid rgba(255,255,255,0.1)',
                background: myStatus === key ? `${STATUS_COLORS[key]}22` : 'transparent',
                color: myStatus === key ? STATUS_COLORS[key] : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: myStatus === key ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[key], display: 'inline-block' }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Members */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>Team</h2>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
          {onlineMembers.length} online · {members.length} total
        </span>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px' }}>Loading team…</div>
      ) : members.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px' }}>No team members yet</div>
      ) : (
        <>
          {onlineMembers.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              {onlineMembers.map(member => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
          {offlineMembers.length > 0 && (
            <div>
              <h4 style={{ color: 'rgba(255,255,255,0.3)', margin: '0 0 12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Offline — {offlineMembers.length}
              </h4>
              {offlineMembers.map(member => (
                <MemberCard key={member.id} member={member} dimmed />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberCard({ member, dimmed }) {
  const initials = (member.name || member.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      borderRadius: '10px',
      marginBottom: '8px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      opacity: dimmed ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `hsl(${(member.name || member.email || '').charCodeAt(0) * 7 % 360}, 60%, 40%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '15px',
        }}>
          {initials}
        </div>
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 12, height: 12, borderRadius: '50%',
          background: STATUS_COLORS[member.status] || STATUS_COLORS.offline,
          border: '2px solid #12172a',
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
          {member.name || member.email}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
          {member.email}
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderRadius: '12px',
        background: `${STATUS_COLORS[member.status] || STATUS_COLORS.offline}22`,
        color: STATUS_COLORS[member.status] || STATUS_COLORS.offline,
        fontSize: '12px', fontWeight: 500,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
        {STATUS_LABELS[member.status] || 'Offline'}
      </div>
    </div>
  );
}
