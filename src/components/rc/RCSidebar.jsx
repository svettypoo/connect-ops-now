import { useState } from 'react';

// SVG icons — no emojis, no lucide (to avoid color override issues)
const MessageSquareIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const PhoneIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const VideoIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const UsersIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const BellIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const GridIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

// More menu items
const DialpadIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="6" cy="6" r="1.5" /><circle cx="12" cy="6" r="1.5" /><circle cx="18" cy="6" r="1.5" />
    <circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
    <circle cx="6" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" />
  </svg>
);

const HashIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const VoicemailIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="11.5" r="4.5" /><circle cx="18.5" cy="11.5" r="4.5" />
    <line x1="5.5" y1="16" x2="18.5" y2="16" />
  </svg>
);

const CalendarIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const BarChart2Icon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const MonitorIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const HeadphonesIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0118 0v6" /><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
  </svg>
);

const MegaphoneIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);

const GitBranchIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 01-9 9" />
  </svg>
);

const BotIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" />
  </svg>
);

const ClockIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShieldIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const Users2Icon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const MailIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);

const MAIN_NAV = [
  { id: 'message', icon: MessageSquareIcon, label: 'Messages' },
  { id: 'voice', icon: PhoneIcon, label: 'Phone' },
  { id: 'video', icon: VideoIcon, label: 'Video' },
  { id: 'contacts', icon: UsersIcon, label: 'Contacts' },
];

const MORE_NAV = [
  { id: 'dialpad', icon: DialpadIcon, label: 'Dialpad' },
  { id: 'recent', icon: PhoneIcon, label: 'Call History' },
  { id: 'voicemail', icon: VoicemailIcon, label: 'Voicemail' },
  { id: 'dm', icon: MailIcon, label: 'Direct Messages' },
  { id: 'channels', icon: HashIcon, label: 'Channels' },
  { id: 'team', icon: Users2Icon, label: 'Team' },
  { id: 'meetings', icon: CalendarIcon, label: 'Meetings' },
  null,
  { id: 'analytics', icon: BarChart2Icon, label: 'Analytics' },
  { id: 'wallboard', icon: MonitorIcon, label: 'Wallboard' },
  { id: 'supervisor', icon: HeadphonesIcon, label: 'Supervisor' },
  { id: 'sms-campaign', icon: MegaphoneIcon, label: 'SMS Campaigns' },
  null,
  { id: 'ivr', icon: GitBranchIcon, label: 'IVR Builder' },
  { id: 'ai-receptionist', icon: BotIcon, label: 'AI Receptionist' },
  { id: 'business-hours', icon: ClockIcon, label: 'Business Hours' },
  { id: 'admin', icon: ShieldIcon, label: 'Admin' },
];

const activeColor = '#93c5fd';
const mutedColor = 'rgba(150,175,210,0.45)';
const activeBg = 'rgba(59,130,246,0.1)';
const hoverBg = 'rgba(59,130,246,0.05)';
const accentBorder = '#3b82f6';

export default function RCSidebar({ activeNav, setActiveNav, user, onLogout, vmUnread = 0 }) {
  const [showMore, setShowMore] = useState(false);

  const go = (id) => { setActiveNav(id); setShowMore(false); };

  const isMainActive = MAIN_NAV.some(n => n.id === activeNav);

  return (
    <div style={{
      width: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0', gap: '4px',
      background: 'rgba(8,12,24,0.95)', backdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(80,120,200,0.08)',
      position: 'relative', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* S&T logo */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', marginBottom: '16px',
        border: '1.5px solid rgba(255,215,100,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
      }}>
        <span style={{ fontWeight: 600, color: 'rgba(255,215,100,0.7)', fontSize: '11px', letterSpacing: '0.5px' }}>S&T</span>
      </div>

      {/* Main nav */}
      {MAIN_NAV.map(({ id, icon: Icon, label }) => {
        const active = activeNav === id;
        return (
          <button
            key={id}
            onClick={() => go(id)}
            title={label}
            style={{
              position: 'relative', width: '40px', height: '40px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? activeBg : 'none',
              border: '1px solid ' + (active ? 'rgba(59,130,246,0.1)' : 'transparent'),
              cursor: 'pointer', transition: 'all 0.2s',
              color: active ? activeColor : mutedColor,
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = 'rgba(200,220,240,0.8)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = mutedColor; } }}
          >
            {active && (
              <div style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: '3px', height: '20px', borderRadius: '0 2px 2px 0', background: accentBorder,
              }} />
            )}
            <Icon size={20} color={active ? activeColor : mutedColor} />
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* Voicemail bell */}
      <button
        onClick={() => go('voicemail')}
        title="Voicemail"
        style={{
          position: 'relative', width: '40px', height: '40px', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: activeNav === 'voicemail' ? activeBg : 'none',
          border: '1px solid ' + (activeNav === 'voicemail' ? 'rgba(59,130,246,0.1)' : 'transparent'),
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (activeNav !== 'voicemail') e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={e => { if (activeNav !== 'voicemail') e.currentTarget.style.background = 'none'; }}
      >
        {activeNav === 'voicemail' && (
          <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: '3px', height: '20px', borderRadius: '0 2px 2px 0', background: accentBorder,
          }} />
        )}
        <BellIcon size={20} color={activeNav === 'voicemail' ? activeColor : mutedColor} />
        {vmUnread > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px', width: '15px', height: '15px',
            background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: '8px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
          }}>{vmUnread}</span>
        )}
      </button>

      {/* More / Grid */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMore(v => !v)}
          title="More"
          style={{
            width: '40px', height: '40px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: (showMore || (!isMainActive && activeNav !== 'voicemail')) ? activeBg : 'none',
            border: '1px solid ' + ((showMore || (!isMainActive && activeNav !== 'voicemail')) ? 'rgba(59,130,246,0.1)' : 'transparent'),
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = hoverBg}
          onMouseLeave={e => e.currentTarget.style.background = (showMore || (!isMainActive && activeNav !== 'voicemail')) ? activeBg : 'none'}
        >
          <GridIcon size={20} color={(showMore || (!isMainActive && activeNav !== 'voicemail')) ? activeColor : mutedColor} />
        </button>

        {showMore && (
          <div style={{
            position: 'absolute', left: '56px', bottom: 0, width: '220px',
            background: 'rgba(12,18,35,0.95)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(80,120,200,0.12)', borderRadius: '14px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)', padding: '8px 0', zIndex: 50,
          }}>
            {MORE_NAV.map((item, i) =>
              !item ? (
                <div key={i} style={{ borderTop: '1px solid rgba(80,120,200,0.08)', margin: '4px 0' }} />
              ) : (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '8px 16px', background: activeNav === item.id ? activeBg : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    color: activeNav === item.id ? activeColor : mutedColor,
                    fontSize: '13px', borderRadius: '0',
                  }}
                  onMouseEnter={e => { if (activeNav !== item.id) e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeNav === item.id ? activeBg : 'none'; e.currentTarget.style.color = activeNav === item.id ? activeColor : mutedColor; }}
                >
                  <item.icon size={16} color={activeNav === item.id ? activeColor : mutedColor} />
                  {item.label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Avatar / logout */}
      <div
        onClick={onLogout}
        title="Logout"
        style={{
          width: '32px', height: '32px', borderRadius: '50%', marginTop: '4px',
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer',
          transition: 'opacity 0.15s', border: '2px solid rgba(100,150,220,0.15)',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.borderColor = 'rgba(100,150,220,0.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'rgba(100,150,220,0.15)'; }}
      >
        {(user?.name || user?.email || 'U')[0].toUpperCase()}
      </div>
    </div>
  );
}
