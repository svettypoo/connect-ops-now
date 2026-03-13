import { useState, useEffect, useRef } from 'react';
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

const BellIcon = ({ size = 22, color = '#6b84a8' }) => (
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

// RecordingsList — fetches /api/recordings and lists them with playback, search, AI summary + transcript expand
function RecordingsList() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    api.getRecordings()
      .then(data => setRecordings(data?.recordings || []))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (rec) => {
    const url = api.streamRecording(rec.id);
    if (playingId === rec.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(url);
      audio.crossOrigin = 'use-credentials';
      audio.onended = () => setPlayingId(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingId(rec.id);
    }
  };

  const deleteRec = async (id, e) => {
    e.stopPropagation();
    await api.deleteRecording(id).catch(() => {});
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
  };

  const fmtDur = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs/60), s = secs%60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  };
  const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1048576) return (bytes/1048576).toFixed(1) + ' MB';
    return Math.round(bytes/1024) + ' KB';
  };
  const fmtTime = (ts) => {
    const d = new Date(ts), now = new Date(), diff = now - d;
    if (diff < 3600000) return Math.round(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff/3600000) + 'h ago';
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };

  const filtered = recordings.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.title||'').toLowerCase().includes(q) || (r.transcript||'').toLowerCase().includes(q) || (r.ai_summary||'').toLowerCase().includes(q);
  });

  if (loading) return <div style={{ padding:'24px', textAlign:'center', color:'#6b84a8', fontSize:'14px' }}>Loading…</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Search bar */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or transcript…"
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'12px', padding:'8px 12px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {filtered.length === 0 && <div style={{ padding:'24px', color:'#6b84a8', textAlign:'center', fontSize:'14px' }}>{recordings.length === 0 ? 'No recordings' : 'No matches'}</div>}

      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.map(rec => {
          const isExpanded = expandedId === rec.id;
          const isPlaying = playingId === rec.id;
          return (
            <div key={rec.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', cursor:'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}>
                <button onClick={(e) => { e.stopPropagation(); toggle(rec); }}
                  style={{ background:'rgba(14,184,255,0.15)', border:'none', borderRadius:'50%', width:'36px', height:'36px', flexShrink:0, cursor:'pointer', color:'#60a5fa', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {isPlaying ? '⏹' : '▶'}
                </button>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:'0 0 2px', fontSize:'13px', color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rec.title || 'Recording'}</p>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ fontSize:'11px', color:'#6b84a8' }}>{fmtTime(rec.created_at)}</span>
                    {rec.duration > 0 && <span style={{ fontSize:'11px', color:'#6b84a8' }}>{fmtDur(rec.duration)}</span>}
                    {rec.size > 0 && <span style={{ fontSize:'11px', color:'#6b84a8' }}>{fmtSize(rec.size)}</span>}
                    {rec.transcript && <span style={{ fontSize:'9px', background:'rgba(6,132,189,0.2)', color:'#60a5fa', padding:'1px 6px', borderRadius:'6px', fontWeight:600 }}>TXT</span>}
                    {rec.ai_summary && <span style={{ fontSize:'9px', background:'rgba(139,92,246,0.2)', color:'#a78bfa', padding:'1px 6px', borderRadius:'6px', fontWeight:600 }}>AI</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  <button onClick={(e) => deleteRec(rec.id, e)}
                    style={{ background:'rgba(244,67,54,0.1)', border:'none', borderRadius:'8px', width:'28px', height:'28px', cursor:'pointer', color:'#f44336', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
                    🗑
                  </button>
                  <span style={{ color:'#243352', fontSize:'12px' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {isExpanded && (rec.ai_summary || rec.transcript) && (
                <div style={{ padding:'0 16px 16px' }}>
                  {rec.ai_summary && (
                    <div style={{ background:'rgba(139,92,246,0.1)', borderRadius:'12px', padding:'12px', marginBottom:'8px' }}>
                      <p style={{ margin:'0 0 6px', fontSize:'10px', color:'#a78bfa', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>AI Summary</p>
                      <p style={{ margin:0, fontSize:'12px', color:'#c4b5fd', lineHeight:1.5, whiteSpace:'pre-line' }}>{rec.ai_summary}</p>
                    </div>
                  )}
                  {rec.transcript && (
                    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px', maxHeight:'120px', overflowY:'auto' }}>
                      <p style={{ margin:'0 0 6px', fontSize:'10px', color:'#6b84a8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Transcript</p>
                      <p style={{ margin:0, fontSize:'12px', color:'#9ca3af', lineHeight:1.5 }}>{rec.transcript}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// TranscriptsList — shows call logs that have transcripts
function TranscriptsList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.getCallLogs().then(data => {
      const all = Array.isArray(data) ? data : (data?.call_logs || []);
      setLogs(all.filter(l => l.transcript && l.transcript.trim().length > 0));
    }).catch(() => setLogs([])).finally(() => setLoading(false));
  }, []);

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #1a2744', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!logs.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#6b84a8', padding: '32px', textAlign: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      <p style={{ margin: 0, fontSize: '14px' }}>No transcripts yet.</p>
      <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>Transcripts are captured from calls using your browser's speech recognition.</p>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {logs.map(log => {
        const isExpanded = expandedId === log.id;
        const name = log.direction === 'inbound' ? (log.from_name || log.from_number) : (log.to_name || log.to_number);
        const number = log.direction === 'inbound' ? log.from_number : log.to_number;
        return (
          <div key={log.id} style={{ borderBottom: '1px solid #1a2744' }}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b84a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', color: '#FFFFFF', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || number || 'Unknown'}</p>
                <p style={{ margin: 0, color: '#6b84a8', fontSize: '12px' }}>{fmtDate(log.started_at)} · {log.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</p>
                {!isExpanded && (
                  <p style={{ margin: '4px 0 0', color: '#4b6a8a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.transcript}</p>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b84a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isExpanded && (
              <div style={{ padding: '0 16px 16px 64px' }}>
                <div style={{ background: '#0f1628', borderRadius: '12px', padding: '12px 14px', border: '1px solid #1a2744' }}>
                  <p style={{ margin: 0, color: '#c8d6e5', fontSize: '13px', lineHeight: 1.6 }}>{log.transcript}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// PhoneScreen: sub-tabs (Keypad, Calls, Voicemail, Transcripts, Recordings)
function PhoneScreen({ phone, user, onDial, onCallBack, vmUnread }) {
  const [subTab, setSubTab] = useState('keypad');
  const SUB_TABS = [
    { id: 'keypad', label: 'Keypad' },
    { id: 'calls', label: `Calls${vmUnread > 0 ? ` (${vmUnread})` : ''}` },
    { id: 'voicemail', label: 'Voicemail' },
    { id: 'transcripts', label: 'Transcripts' },
    { id: 'recordings', label: 'Recordings' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #1a2744',
        overflowX: 'auto', flexShrink: 0, background: '#0a0e1a',
        scrollbarWidth: 'none',
      }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: subTab === t.id ? '#3b82f6' : '#6b84a8',
            borderBottom: subTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            fontSize: '14px', fontWeight: subTab === t.id ? 600 : 400,
            flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>
      {/* Caller ID bar */}
      <div style={{
        padding: '8px 16px', background: '#0a0e1a',
        borderBottom: '1px solid #1a2744', flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', color: '#6b84a8' }}>
          My caller ID:{' '}
          <span style={{ color: '#FFFFFF' }}>{phone?.phoneNumber || '+1 (587) 864-3090'}</span>
          <span style={{ color: '#3b82f6', marginLeft: '4px' }}>&#9660;</span>
        </span>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {subTab === 'keypad' && <Dialpad phone={phone} onDial={onDial} />}
        {subTab === 'calls' && <CallHistory onCallBack={onCallBack} />}
        {subTab === 'voicemail' && <VoicemailList onCallBack={onCallBack} />}
        {subTab === 'transcripts' && <TranscriptsList />}
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
    <div style={{ height: '100%', overflowY: 'auto', background: '#0a0e1a' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2744' }}>
        <input
          placeholder="Search contacts..."
          style={{
            width: '100%', background: '#0f1628', border: '1px solid #1a2744',
            borderRadius: '10px', padding: '8px 12px', color: '#FFFFFF',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {contacts.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b84a8', fontSize: '14px' }}>
          No contacts found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {contacts.map(c => (
            <div key={c.id || c.email} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderBottom: '1px solid #1a2744',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#3b82f6', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {getInitialsLocal(c.name || c.email)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || c.email}</div>
                {c.phone && <div style={{ color: '#6b84a8', fontSize: '12px' }}>{c.phone}</div>}
              </div>
              {c.phone && (
                <button onClick={() => onCall && onCall(c)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                  color: '#3b82f6',
                }}>
                  <PhoneIcon size={18} color="#3b82f6" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// AudioDeviceSettings — mic/speaker selection + test
function AudioDeviceSettings({ onBack }) {
  const [mics, setMics] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selMic, setSelMic] = useState(localStorage.getItem('con_mic_id') || '');
  const [selSpk, setSelSpk] = useState(localStorage.getItem('con_spk_id') || '');
  const [micTesting, setMicTesting] = useState(false);
  const [spkTesting, setSpkTesting] = useState(false);
  const [micResult, setMicResult] = useState(''); // 'ok' | 'error'

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setMics(devs.filter(d => d.kind === 'audioinput'));
      setSpeakers(devs.filter(d => d.kind === 'audiooutput'));
    }).catch(() => {});
  }, []);

  const saveMic = (id) => { setSelMic(id); localStorage.setItem('con_mic_id', id); };
  const saveSpk = (id) => { setSelSpk(id); localStorage.setItem('con_spk_id', id); };

  const testMic = async () => {
    setMicTesting(true); setMicResult('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: selMic ? { deviceId: selMic } : true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(url);
        setMicTesting(false); setMicResult('ok');
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 3000);
    } catch { setMicTesting(false); setMicResult('error'); }
  };

  const testSpeaker = () => {
    setSpkTesting(true);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => { ctx.close(); setSpkTesting(false); };
  };

  const sLabel = { fontSize:'11px', color:'#6b84a8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' };
  const sSelect = {
    width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'10px', padding:'8px 12px', color:'#fff', fontSize:'13px', outline:'none',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0e1a' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#6b84a8', cursor:'pointer', padding:'4px', display:'flex' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style={{ color:'#fff', fontSize:'15px', fontWeight:600 }}>Audio Devices</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:'24px' }}>
        {/* Microphone */}
        <div>
          <p style={sLabel}>Microphone</p>
          <select value={selMic} onChange={e => saveMic(e.target.value)} style={sSelect}>
            <option value="">System default</option>
            {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic ' + m.deviceId.slice(0,6)}</option>)}
          </select>
          <button onClick={testMic} disabled={micTesting}
            style={{ marginTop:'10px', padding:'8px 16px', borderRadius:'10px', background:'rgba(14,184,255,0.1)', border:'1px solid rgba(14,184,255,0.2)', color:'#60a5fa', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: micTesting ? 0.5 : 1 }}>
            {micTesting ? 'Recording 3s… play back' : '🎙 Test mic (3s record + play)'}
          </button>
          {micResult === 'ok' && <p style={{ color:'#4CAF50', fontSize:'12px', marginTop:'6px' }}>Mic working — you should hear playback</p>}
          {micResult === 'error' && <p style={{ color:'#F44336', fontSize:'12px', marginTop:'6px' }}>Mic access failed — check permissions</p>}
        </div>
        {/* Speaker */}
        <div>
          <p style={sLabel}>Speaker / Output</p>
          <select value={selSpk} onChange={e => saveSpk(e.target.value)} style={sSelect}>
            <option value="">System default</option>
            {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speaker ' + s.deviceId.slice(0,6)}</option>)}
          </select>
          <button onClick={testSpeaker} disabled={spkTesting}
            style={{ marginTop:'10px', padding:'8px 16px', borderRadius:'10px', background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.2)', color:'#4CAF50', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: spkTesting ? 0.5 : 1 }}>
            {spkTesting ? 'Playing beep…' : '🔊 Test speaker (play beep)'}
          </button>
        </div>
        <p style={{ fontSize:'11px', color:'#243352', textAlign:'center' }}>Device selections are saved and applied to all calls</p>
      </div>
    </div>
  );
}

// MoreSettings: vertical scrollable settings/profile list — matches real RC "More" tab
function MoreSettings({ user, onLogout, onNavigate }) {
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  if (showAudioSettings) return <AudioDeviceSettings onBack={() => setShowAudioSettings(false)} />;

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
    { id: 'audio-devices', label: 'Audio Devices', icon: HeadphonesIcon },
    { id: 'contacts-settings', label: 'Calendars and contacts', icon: ContactsBookIcon },
  ];

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', borderBottom: '1px solid #1a2744',
    cursor: 'pointer', background: 'none', border: 'none',
    width: '100%', textAlign: 'left',
  };

  const iconWrap = (Icon) => (
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: 'rgba(6,132,189,0.15)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={18} color="#3b82f6" />
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0a0e1a' }}>
      {/* Profile header */}
      <div style={{ padding: '24px 16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #1a2744' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#3b82f6', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '22px', fontWeight: 700,
          color: '#fff', flexShrink: 0,
        }}>
          {userInitials}
        </div>
        <div>
          <div style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 700, marginBottom: '2px' }}>{userName}</div>
          <div style={{ color: '#6b84a8', fontSize: '13px' }}>{userPhone}</div>
        </div>
      </div>

      {/* Top section — no label */}
      <div style={{ borderBottom: '1px solid #1a2744' }}>
        {topItems.map(item => (
          <button
            key={item.id}
            onClick={() => {}}
            style={{ ...itemStyle, borderBottom: '1px solid #1a2744' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0f1628'}
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
        <div style={{ padding: '12px 16px 4px', color: '#6b84a8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Settings
        </div>
        {settingsItems.map((item, i) => (
          <button
            key={`${item.id}-${i}`}
            onClick={() => {
              if (item.id === 'audio-devices') { setShowAudioSettings(true); return; }
              if (['message', 'contacts'].includes(item.id)) onNavigate && onNavigate(item.id);
            }}
            style={{ ...itemStyle }}
            onMouseEnter={e => e.currentTarget.style.background = '#0f1628'}
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
    <div style={{ display: 'flex', height: '100vh', background: '#0a0e1a', overflow: 'hidden', position: 'relative', fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif" }}>

      {/* Desktop sidebar */}
      <div className="hidden sm:flex flex-col">
        <RCSidebar activeNav={activeNav} setActiveNav={(id) => { if (id === 'voice') { setDialTo(''); setDialName(''); } setActiveNav(id); }} user={user} onLogout={logout} vmUnread={vmUnread} />
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

      {/* Mic permission denied banner */}
      {phone.micStatus === 'denied' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 61,
          background: 'linear-gradient(135deg, #4A1010, #7B1818)',
          borderBottom: '1px solid #F44336',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 24px rgba(244,67,54,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <div>
              <div style={{ fontSize: '12px', color: '#EF9A9A', fontWeight: 600 }}>Microphone access blocked</div>
              <div style={{ fontSize: '11px', color: '#FFCDD2' }}>Click the lock icon in your browser address bar and allow microphone access, then reload.</div>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: 'rgba(244,67,54,0.2)', border: '1px solid rgba(244,67,54,0.4)', color: '#FF5252', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            Reload
          </button>
        </div>
      )}

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
            background: '#0a0e1a', height: '56px', borderBottom: '1px solid #1a2744',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', flexShrink: 0,
          }}>
            {/* Left: user avatar + tab title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                <GroupAddIcon size={22} color="#6b84a8" />
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                <KebabIcon size={22} color="#6b84a8" />
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
        background: '#0a0e1a', borderTop: '1px solid #1a2744',
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
                color: isActive ? '#3b82f6' : '#6b84a8',
                padding: '4px 8px', minWidth: '60px',
                position: 'relative',
              }}
            >
              <Icon size={22} color={isActive ? '#3b82f6' : '#6b84a8'} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400, color: isActive ? '#3b82f6' : '#6b84a8' }}>
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
