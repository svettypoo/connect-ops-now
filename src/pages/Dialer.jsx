import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/inboxAiClient';
import { usePhone } from '@/lib/usePhone';

import RCSidebar from '@/components/rc/RCSidebar';
import RCListPanel from '@/components/rc/RCListPanel';
import RCContactPanel from '@/components/rc/RCContactPanel';

import Dialpad from '@/components/dialer/Dialpad';
import VoiceCall from '@/components/dialer/VoiceCall';
import VideoCall from '@/components/dialer/VideoCall';
import Messaging from '@/components/dialer/Messaging';
import CallHistory from '@/components/dialer/CallHistory';
import VoicemailList from '@/components/dialer/VoicemailList';
import AnalyticsDashboard from '@/components/features/AnalyticsDashboard';
import ChannelsView from '@/components/features/ChannelsView';
import WallboardView from '@/components/features/WallboardView';
import IVRBuilder from '@/components/features/IVRBuilder';
import AdminPanel from '@/components/features/AdminPanel';
import AIReceptionist from '@/components/features/AIReceptionist';
import SMSCampaign from '@/components/features/SMSCampaign';
import SupervisorPanel from '@/components/features/SupervisorPanel';
import BusinessHours from '@/components/features/BusinessHours';
import MeetingScheduler from '@/components/features/MeetingScheduler';
import TeamView from '@/components/dialer/TeamView';
import DirectMessages from '@/components/dialer/DirectMessages';
import NotificationSettings from '@/components/settings/NotificationSettings';

// SVG icons — no emojis
const DialpadIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="6" cy="6" r="1.5" />
    <circle cx="12" cy="6" r="1.5" />
    <circle cx="18" cy="6" r="1.5" />
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
    <circle cx="6" cy="18" r="1.5" />
    <circle cx="12" cy="18" r="1.5" />
    <circle cx="18" cy="18" r="1.5" />
  </svg>
);

// Phone tab icon (handset, filled)
const PhoneTabIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
  </svg>
);

const MessageIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const VideoIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const ContactIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Three dots (more) icon
const DotsIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const BellIcon = ({ size = 22, color = '#8B8F9B' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const PhoneIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const BarChartIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const MonitorIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const HeadphonesIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0118 0v6" /><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
  </svg>
);

const MegaphoneIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);

const GitBranchIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 01-9 9" />
  </svg>
);

const BotIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);

const ClockIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShieldIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const UsersIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const CalendarIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const VoicemailIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="11.5" r="4.5" /><circle cx="18.5" cy="11.5" r="4.5" /><line x1="5.5" y1="16" x2="18.5" y2="16" />
  </svg>
);

const HashIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const MailIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);

// Group-add icon (two people + plus)
const GroupAddIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3z" />
    <path d="M8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3z" />
    <path d="M8 13c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    <path d="M20 14v3m-1.5-1.5h3" />
  </svg>
);

// Three-dot kebab (vertical)
const KebabIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

// Chevron right
const ChevronRight = ({ size = 16, color = '#555' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Incoming call rules icon
const IncomingCallIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 2 16 8 22 8" />
    <line x1="23" y1="1" x2="16" y2="8" />
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

// Auto-reply icon
const AutoReplyIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 00-4-4H4" />
  </svg>
);

// Add account icon
const AddPersonIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="16" y1="11" x2="22" y2="11" />
  </svg>
);

// Notifications icon
const NotificationsIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

// Contacts book icon
const ContactsBookIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
    <circle cx="9" cy="11" r="2.5" />
    <path d="M14 19v-1a3 3 0 00-3-3H8a3 3 0 00-3 3v1" />
  </svg>
);

// Sign out icon
const SignOutIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const HAS_LIST = ['message', 'recent', 'contacts', 'voicemail', 'video', 'channels', 'dm'];

// 4 tabs only — matching real RingCentral mobile app
const MOBILE_TABS = [
  { id: 'phone', label: 'Phone', icon: PhoneTabIcon },
  { id: 'message', label: 'Text', icon: MessageIcon },
  { id: 'contacts', label: 'Contacts', icon: ContactIcon },
  { id: 'more', label: 'More', icon: DotsIcon },
];

const TAB_LABELS = {
  phone: 'Phone', message: 'Text', contacts: 'Contacts', more: 'More',
  voice: 'Call', recent: 'Call History', voicemail: 'Voicemail',
  analytics: 'Analytics', wallboard: 'Wallboard', supervisor: 'Supervisor',
  'sms-campaign': 'SMS Campaigns', ivr: 'IVR Builder', 'ai-receptionist': 'AI Receptionist',
  'business-hours': 'Business Hours', admin: 'Admin', team: 'Team', meetings: 'Meetings',
  channels: 'Channels', dm: 'Direct Messages',
};

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/[\s@]/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// RecordingsList — fetches /api/recordings and lists them with a playback button
function RecordingsList() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useState(null);

  useEffect(() => {
    api.getRecordings()
      .then(data => setRecordings(data?.recordings || []))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (rec) => {
    const url = api.streamRecording(rec.id);
    if (playingId === rec.id) {
      audioRef[0]?.pause();
      setPlayingId(null);
    } else {
      audioRef[0]?.pause();
      const audio = new Audio(url);
      audio.crossOrigin = 'use-credentials';
      audio.onended = () => setPlayingId(null);
      audio.play().catch(() => {});
      audioRef[0] = audio;
      setPlayingId(rec.id);
    }
  };

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: '#8B8F9B', fontSize: '14px' }}>Loading…</div>;
  if (!recordings.length) return <div style={{ padding: '24px', color: '#8B8F9B', textAlign: 'center', fontSize: '14px' }}>No recordings</div>;

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {recordings.map(rec => (
        <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => toggle(rec)} style={{ background: 'rgba(14,184,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#0EB8FF', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playingId === rec.id ? '⏹' : '▶'}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title || 'Recording'}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#8B8F9B' }}>{new Date(rec.created_at).toLocaleString()} · {rec.size ? (rec.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// PhoneScreen: sub-tabs (Keypad, Calls, Voicemail, Notes, Recordings)
function PhoneScreen({ phone, user, onDial, onCallBack, vmUnread }) {
  const [subTab, setSubTab] = useState('keypad');
  const SUB_TABS = [
    { id: 'keypad', label: 'Keypad' },
    { id: 'calls', label: `Calls${vmUnread > 0 ? ` (${vmUnread})` : ''}` },
    { id: 'voicemail', label: 'Voicemail' },
    { id: 'notes', label: '\u2736 Notes' },
    { id: 'recordings', label: 'Recordings' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #2A2D35',
        overflowX: 'auto', flexShrink: 0, background: '#17191C',
        scrollbarWidth: 'none',
      }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: subTab === t.id ? '#0684BD' : '#8B8F9B',
            borderBottom: subTab === t.id ? '2px solid #0684BD' : '2px solid transparent',
            fontSize: '14px', fontWeight: subTab === t.id ? 600 : 400,
            flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>
      {/* Caller ID bar */}
      <div style={{
        padding: '8px 16px', background: '#17191C',
        borderBottom: '1px solid #2A2D35', flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', color: '#8B8F9B' }}>
          My caller ID:{' '}
          <span style={{ color: '#FFFFFF' }}>{phone?.phoneNumber || '+1 (587) 983-6164'}</span>
          <span style={{ color: '#0684BD', marginLeft: '4px' }}>&#9660;</span>
        </span>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {subTab === 'keypad' && <Dialpad phone={phone} onDial={onDial} />}
        {subTab === 'calls' && <CallHistory onCallBack={onCallBack} />}
        {subTab === 'voicemail' && <VoicemailList onCallBack={onCallBack} />}
        {subTab === 'notes' && (
          <div style={{ padding: '24px', color: '#8B8F9B', textAlign: 'center', fontSize: '14px' }}>
            No notes yet
          </div>
        )}
        {subTab === 'recordings' && <RecordingsList />}
      </div>
    </div>
  );
}

// ContactsView: simple contacts list placeholder
function ContactsView({ onCall, onMessage }) {
  const [contacts, setContacts] = useState([]);
  useEffect(() => {
    import('@/api/inboxAiClient').then(m => {
      const a = m.api || m.default;
      if (a && a.getContacts) a.getContacts().then(cs => { if (Array.isArray(cs)) setContacts(cs); }).catch(() => {});
    });
  }, []);

  const getInitialsLocal = (n) => {
    if (!n) return '?';
    return n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#17191C' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2D35' }}>
        <input
          placeholder="Search contacts..."
          style={{
            width: '100%', background: '#1E2025', border: '1px solid #2A2D35',
            borderRadius: '10px', padding: '8px 12px', color: '#FFFFFF',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {contacts.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#8B8F9B', fontSize: '14px' }}>
          No contacts found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {contacts.map(c => (
            <div key={c.id || c.email} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderBottom: '1px solid #2A2D35',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#0684BD', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {getInitialsLocal(c.name || c.email)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || c.email}</div>
                {c.phone && <div style={{ color: '#8B8F9B', fontSize: '12px' }}>{c.phone}</div>}
              </div>
              {c.phone && (
                <button onClick={() => onCall && onCall(c)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                  color: '#0684BD',
                }}>
                  <PhoneIcon size={18} color="#0684BD" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// MoreSettings: vertical scrollable settings/profile list — matches real RC "More" tab
function MoreSettings({ user, onLogout, onNavigate }) {
  const userInitials = getInitials(user?.name || user?.email);
  const userName = user?.name || user?.email || 'User';
  const userPhone = '+1 (587) 983-6164';

  const topItems = [
    { id: 'incoming-rules', label: 'Incoming call rules', icon: IncomingCallIcon },
    { id: 'auto-replies', label: 'Auto-replies', icon: AutoReplyIcon },
    { id: 'add-account', label: 'Add account', icon: AddPersonIcon },
  ];

  const settingsItems = [
    { id: 'message', label: 'Message', icon: MessageIcon },
    { id: 'video', label: 'Video', icon: VideoIcon },
    { id: 'phone-settings', label: 'Phone', icon: PhoneTabIcon },
    { id: 'voicemail-settings', label: 'Voicemail', icon: VoicemailIcon },
    { id: 'message', label: 'Text', icon: MessageIcon },
    { id: 'notifications', label: 'Notifications', icon: NotificationsIcon },
    { id: 'contacts-settings', label: 'Calendars and contacts', icon: ContactsBookIcon },
  ];

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', borderBottom: '1px solid #2A2D35',
    cursor: 'pointer', background: 'none', border: 'none',
    width: '100%', textAlign: 'left',
  };

  const iconWrap = (Icon) => (
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: 'rgba(6,132,189,0.15)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={18} color="#0684BD" />
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#17191C' }}>
      {/* Profile header */}
      <div style={{ padding: '24px 16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #2A2D35' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#0684BD', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '22px', fontWeight: 700,
          color: '#fff', flexShrink: 0,
        }}>
          {userInitials}
        </div>
        <div>
          <div style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 700, marginBottom: '2px' }}>{userName}</div>
          <div style={{ color: '#8B8F9B', fontSize: '13px' }}>{userPhone}</div>
        </div>
      </div>

      {/* Top section — no label */}
      <div style={{ borderBottom: '1px solid #2A2D35' }}>
        {topItems.map(item => (
          <button
            key={item.id}
            onClick={() => {}}
            style={{ ...itemStyle, borderBottom: '1px solid #2A2D35' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1E2025'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {iconWrap(item.icon)}
            <span style={{ flex: 1, color: '#FFFFFF', fontSize: '14px' }}>{item.label}</span>
            <ChevronRight size={16} color="#555" />
          </button>
        ))}
      </div>

      {/* Settings section */}
      <div>
        <div style={{ padding: '12px 16px 4px', color: '#8B8F9B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Settings
        </div>
        {settingsItems.map((item, i) => (
          <button
            key={`${item.id}-${i}`}
            onClick={() => {
              if (['message', 'contacts'].includes(item.id)) onNavigate && onNavigate(item.id);
            }}
            style={{ ...itemStyle }}
            onMouseEnter={e => e.currentTarget.style.background = '#1E2025'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {iconWrap(item.icon)}
            <span style={{ flex: 1, color: '#FFFFFF', fontSize: '14px' }}>{item.label}</span>
            <ChevronRight size={16} color="#555" />
          </button>
        ))}
      </div>

      {/* Sign out */}
      <div style={{ padding: '16px' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)',
            color: '#F44336', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
          }}
        >
          <SignOutIcon size={18} color="#F44336" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Dialer() {
  const { user, logout } = useAuth();
  const phone = usePhone();
  const [activeNav, setActiveNav] = useState('phone');
  const [dialTo, setDialTo] = useState('');
  const [dialName, setDialName] = useState('');
  const [activeContact, setActiveContact] = useState(null);
  const [vmUnread, setVmUnread] = useState(0);
  const [messageTo, setMessageTo] = useState('');

  useEffect(() => {
    api.getVoicemails().then(vms => setVmUnread(vms.filter(v => !v.is_read).length)).catch(() => {});
  }, [activeNav]);

  const callContact = (c) => { setDialTo(c.phone); setDialName(c.name || c.phone); setActiveNav('voice'); };
  const videoContact = (c) => { setActiveNav('video'); };
  const messageContact = (c) => { setMessageTo(c.phone); setActiveNav('message'); };

  const handleCallBack = (number, name) => { setDialTo(number); setDialName(name || number); setActiveNav('voice'); };
  const handleDialDirect = (number) => { setDialTo(number); setDialName(number); setActiveNav('voice'); };

  const inbound = phone.inboundCall;
  const showList = HAS_LIST.includes(activeNav);

  // Map mobile tab to active state
  const mobileTabActive = MOBILE_TABS.find(t => t.id === activeNav) ? activeNav : 'more';

  const userInitials = getInitials(user?.name || user?.email);

  // Current tab label for header
  const headerLabel = TAB_LABELS[activeNav] || 'Phone';

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#17191C', overflow: 'hidden', position: 'relative', fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif" }}>

      {/* Desktop sidebar */}
      <div className="hidden sm:flex flex-col">
        <RCSidebar activeNav={activeNav} setActiveNav={setActiveNav} user={user} onLogout={logout} vmUnread={vmUnread} />
      </div>

      {/* List panel — desktop only */}
      <div className="hidden sm:contents">
        {showList && (
          <RCListPanel
            activeNav={activeNav}
            onSelectContact={c => { setActiveContact(c); }}
            onCallBack={handleCallBack}
            onSelectMessage={num => { setMessageTo(num); setActiveNav('message'); }}
          />
        )}
      </div>

      {/* Inbound call banner */}
      {inbound && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
          background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
          borderBottom: '1px solid #4CAF50',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 24px rgba(76,175,80,0.3)',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#81C784', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Incoming Call</div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '17px' }}>{inbound.callerNumber}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => phone.answerCall()}
              style={{ background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
            >
              Answer
            </button>
            <button
              onClick={() => phone.hangup()}
              style={{ background: '#F44336', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', minWidth: 0, paddingBottom: 0 }} className="sm:pb-0 pb-16">
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* RC-style mobile header — matches real RingCentral */}
          <div className="flex sm:hidden" style={{
            background: '#17191C', height: '56px', borderBottom: '1px solid #2A2D35',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', flexShrink: 0,
          }}>
            {/* Left: user avatar + tab title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#0684BD', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {userInitials}
              </div>
              <span style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 700 }}>
                {headerLabel}
              </span>
            </div>
            {/* Right: group-add + kebab */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                <GroupAddIcon size={22} color="#8B8F9B" />
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                <KebabIcon size={22} color="#8B8F9B" />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeNav === 'phone' && (
              <PhoneScreen phone={phone} user={user} onDial={handleDialDirect} onCallBack={handleCallBack} vmUnread={vmUnread} />
            )}
            {activeNav === 'voice' && (
              <VoiceCall phone={phone} dialTo={dialTo} dialName={dialName} onHangup={() => setActiveNav('phone')} />
            )}
            {activeNav === 'message' && <Messaging initialTo={messageTo} />}
            {activeNav === 'contacts' && (
              <ContactsView onCall={callContact} onMessage={messageContact} />
            )}
            {activeNav === 'more' && (
              <MoreSettings user={user} onLogout={logout} onNavigate={id => setActiveNav(id)} />
            )}
            {/* Legacy / desktop views still reachable from sidebar */}
            {activeNav === 'video' && <VideoCall />}
            {activeNav === 'recent' && <CallHistory onCallBack={handleCallBack} />}
            {activeNav === 'voicemail' && <VoicemailList onCallBack={handleCallBack} />}
            {activeNav === 'analytics' && <AnalyticsDashboard />}
            {activeNav === 'channels' && <ChannelsView />}
            {activeNav === 'wallboard' && <WallboardView />}
            {activeNav === 'ivr' && <IVRBuilder />}
            {activeNav === 'admin' && <AdminPanel />}
            {activeNav === 'ai-receptionist' && <AIReceptionist />}
            {activeNav === 'sms-campaign' && <SMSCampaign />}
            {activeNav === 'supervisor' && <SupervisorPanel />}
            {activeNav === 'business-hours' && <BusinessHours />}
            {activeNav === 'meetings' && <MeetingScheduler />}
            {activeNav === 'team' && <TeamView />}
            {activeNav === 'dm' && <DirectMessages />}
            {activeNav === 'notifications' && <NotificationSettings />}
          </div>
        </div>

        {activeContact && HAS_LIST.includes(activeNav) && (
          <RCContactPanel
            contact={activeContact}
            onClose={() => setActiveContact(null)}
            onCall={() => callContact(activeContact)}
            onVideo={() => videoContact(activeContact)}
            onSms={() => messageContact(activeContact)}
            onEmail={() => window.open('mailto:' + activeContact.email)}
          />
        )}
      </div>

      {/* Mobile bottom nav — 4 tabs */}
      <div className="flex sm:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: '#17191C', borderTop: '1px solid #2A2D35',
        height: '64px', paddingBottom: 'env(safe-area-inset-bottom)',
        alignItems: 'center', justifyContent: 'space-around',
      }}>
        {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeNav || (id === 'phone' && activeNav === 'voice');
          return (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: isActive ? '#0684BD' : '#8B8F9B',
                padding: '4px 8px', minWidth: '60px',
                position: 'relative',
              }}
            >
              <Icon size={22} color={isActive ? '#0684BD' : '#8B8F9B'} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400, color: isActive ? '#0684BD' : '#8B8F9B' }}>
                {label}
              </span>
              {/* Red badge on Phone tab for missed calls */}
              {id === 'phone' && vmUnread > 0 && (
                <div style={{
                  position: 'absolute', top: '2px', right: '8px',
                  background: '#F44336', color: '#fff', borderRadius: '10px',
                  fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{vmUnread}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
