import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/inboxAiClient';
import { usePhone } from '@/lib/usePhone';

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

// ─── Sidebar Nav Sections (matches mockup exactly) ────────────────────────────
const NAV_SECTIONS = [
  { label: 'Communication', items: [
    { id: 'phone', label: 'Phone', path: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' },
    { id: 'messages', label: 'Messages', path: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z', badge: 'msg' },
    { id: 'video', label: 'Video', path: 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z' },
    { id: 'contacts', label: 'Contacts', path: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
  ]},
  { label: 'History', items: [
    { id: 'history', label: 'Call History', path: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', badge: 'history' },
    { id: 'voicemail', label: 'Voicemail', path: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75', badge: 'vm', badgeRed: true },
    { id: 'recordings', label: 'Recordings', path: 'M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z' },
  ]},
  { label: 'Team', items: [
    { id: 'channels', label: 'Channels', path: 'M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.6 19.5m-2.1-19.5-3.6 19.5' },
    { id: 'team', label: 'Team', path: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
    { id: 'meetings', label: 'Meetings', path: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5' },
  ]},
  { label: 'Management', items: [
    { id: 'analytics', label: 'Analytics', path: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' },
    { id: 'wallboard', label: 'Wallboard', path: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z' },
    { id: 'supervisor', label: 'Supervisor', path: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z' },
  ]},
  { label: 'Configuration', items: [
    { id: 'ivr', label: 'IVR Builder', path: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75' },
    { id: 'ai-receptionist', label: 'AI Receptionist', path: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z' },
    { id: 'sms-campaign', label: 'SMS Campaigns', path: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46' },
    { id: 'business-hours', label: 'Business Hours', path: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { id: 'admin', label: 'Admin', path: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
  ]},
];

function NavIcon({ path }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {path.includes('M') && path.split(' M').map((p, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i === 0 ? p : 'M' + p} />
      ))}
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarComp({ activeNav, setActiveNav, user, onLogout, vmUnread, msgUnread, onNewCall }) {
  const initials = getInitials(user?.name || user?.email);
  return (
    <aside style={{ width:240, minWidth:240, height:'100%', background:'rgba(8,12,24,0.97)', borderRight:'1px solid rgba(80,120,200,0.08)', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* Brand */}
      <div style={{ padding:'22px 20px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#b8860b,#daa520,#f0c040)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.58rem', color:'#1a0e00', letterSpacing:'0.8px', flexShrink:0, boxShadow:'0 2px 12px rgba(218,165,32,0.2)' }}>S&T</div>
          <div>
            <div style={{ fontSize:'0.78rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'rgba(200,214,229,0.75)', fontWeight:600 }}>S&T Properties</div>
            <div style={{ fontSize:'0.55rem', letterSpacing:'4px', textTransform:'uppercase', color:'rgba(100,150,220,0.45)', marginTop:1 }}>Phone System</div>
          </div>
        </div>
      </div>
      {/* New Call button */}
      <button onClick={onNewCall} style={{ margin:'0 16px 12px', padding:'10px', fontSize:'0.82rem', fontWeight:600, color:'#fff', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>
        New Call
      </button>
      {/* Nav */}
      <nav style={{ flex:1, padding:'0 8px' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div style={{ fontSize:'0.6rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(100,140,180,0.35)', padding:'14px 12px 6px' }}>{section.label}</div>
            {section.items.map(item => {
              const isActive = activeNav === item.id;
              const badge = item.badge === 'vm' ? vmUnread : item.badge === 'msg' ? msgUnread : 0;
              return (
                <div key={item.id} onClick={() => setActiveNav(item.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', fontSize:'0.82rem', color: isActive ? '#93c5fd' : '#c8d6e5', borderRadius:8, cursor:'pointer', border:'1px solid', borderColor: isActive ? 'rgba(59,130,246,0.1)' : 'transparent', background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent', transition:'all 0.15s' }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='rgba(59,130,246,0.05)'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='transparent'; } }}
                >
                  <span style={{ width:18, height:18, flexShrink:0, opacity: isActive ? 1 : 0.6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
                    </svg>
                  </span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {badge > 0 && <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:10, background: item.badgeRed ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: item.badgeRed ? '#f87171' : '#60a5fa', fontWeight:600 }}>{badge}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      {/* User */}
      <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(80,120,200,0.08)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'#fff', flexShrink:0, position:'relative' }}>
          {initials}
          <span style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:'#10b981', border:'2px solid rgba(8,12,24,0.9)' }}></span>
        </div>
        <div style={{ overflow:'hidden', flex:1 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name || user?.email}</div>
          <div style={{ fontSize:'0.65rem', color:'rgba(100,140,180,0.45)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
        </div>
        <button onClick={onLogout} title="Sign out" style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(100,140,180,0.45)', padding:4, display:'flex', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
const APP_LINKS = [
  { title:'Mail', href:'https://mail.zoho.com', path:'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75' },
  { title:'Phone', href:'https://phone.stproperties.com', path:'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z', active: true },
  { title:'Meet', href:'https://meet.jit.si', path:'m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z' },
  { title:'Inbox AI', href:'https://inbox.stproperties.com', path:'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z' },
  { title:'Concierge', href:'https://concierge.stproperties.com', path:'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0' },
  { title:'Birthday', href:'https://birthday.stproperties.com', path:'M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z' },
];

function TopBarComp({ search, setSearch, user }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const initials = getInitials(user?.name || user?.email);
  return (
    <div style={{ height:52, minHeight:52, display:'flex', alignItems:'center', padding:'0 20px', gap:16, borderBottom:'1px solid rgba(80,120,200,0.08)', flexShrink:0 }}>
      <div style={{ position:'relative' }}>
        <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', opacity:0.4, pointerEvents:'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8d6e5" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search calls, contacts, messages..." style={{ width:300, padding:'8px 14px 8px 36px', fontSize:'0.82rem', color:'#e2e8f0', background:'rgba(15,22,40,0.5)', border:'1px solid rgba(80,120,200,0.08)', borderRadius:20, outline:'none' }} />
      </div>
      <div style={{ flex:1 }} />
      <div style={{ fontSize:'0.78rem', color:'#c8d6e5', whiteSpace:'nowrap' }}>{dateStr}</div>
      <div style={{ display:'flex', gap:6, marginLeft:12 }}>
        {APP_LINKS.map(app => (
          <a key={app.title} href={app.href} target="_blank" rel="noreferrer" title={app.title} style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, cursor:'pointer', border:'1px solid', borderColor: app.active ? 'rgba(59,130,246,0.2)' : 'rgba(80,120,200,0.08)', background: app.active ? 'rgba(59,130,246,0.15)' : 'rgba(15,22,40,0.4)', color: app.active ? '#93c5fd' : '#c8d6e5', textDecoration:'none', transition:'all 0.15s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path strokeLinecap="round" strokeLinejoin="round" d={app.path} /></svg>
          </a>
        ))}
      </div>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'#fff', marginLeft:8, flexShrink:0 }}>{initials}</div>
    </div>
  );
}

// ─── List Panel ───────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#a78bfa)','linear-gradient(135deg,#10b981,#34d399)','linear-gradient(135deg,#ef4444,#f97316)','linear-gradient(135deg,#f59e0b,#fbbf24)','linear-gradient(135deg,#ec4899,#f472b6)','linear-gradient(135deg,#6366f1,#818cf8)'];
function avatarColor(str) { let h=0; for(let i=0;i<(str||'').length;i++) h=(h*31+str.charCodeAt(i))%AVATAR_COLORS.length; return AVATAR_COLORS[h]; }

function fmtLogTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function ListPanelComp({ activeNav, callLogs, contacts, selectedId, onSelect }) {
  const [filter, setFilter] = useState('recent');
  const pills = ['Recent', 'Missed', 'Contacts'];

  const logItems = filter === 'contacts' ? [] : callLogs.filter(l => filter !== 'missed' || l.call_type === 'missed' || l.duration === 0);
  const contactItems = filter === 'contacts' ? contacts : [];

  return (
    <div style={{ width:360, minWidth:360, borderRight:'1px solid rgba(80,120,200,0.08)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(80,120,200,0.06)', flexShrink:0 }}>
        {pills.map(p => {
          const isActive = filter === p.toLowerCase();
          return (
            <button key={p} onClick={() => setFilter(p.toLowerCase())} style={{ padding:'5px 14px', fontSize:'0.75rem', borderRadius:16, cursor:'pointer', background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(15,22,40,0.4)', color: isActive ? '#93c5fd' : '#c8d6e5', border:'1px solid', borderColor: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(80,120,200,0.08)', transition:'all 0.15s' }}>{p}</button>
          );
        })}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {filter === 'contacts' ? contactItems.map(c => {
          const ini = getInitials(c.name || c.phone);
          const isActive = selectedId === 'c_' + c.id;
          return (
            <div key={c.id} onClick={() => onSelect({ type:'contact', data:c, id:'c_'+c.id })}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderLeft:'2px solid', borderLeftColor: isActive ? '#3b82f6' : 'transparent', background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent', transition:'all 0.15s' }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:avatarColor(c.name||c.phone), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#fff', flexShrink:0 }}>{ini}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>{c.name || c.phone}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.phone}</div>
              </div>
            </div>
          );
        }) : logItems.map(l => {
          const name = l.from_name || l.to_name || (l.direction === 'inbound' ? l.from_number : l.to_number) || 'Unknown';
          const num = l.direction === 'inbound' ? l.from_number : l.to_number;
          const isMissed = l.call_type === 'missed' || (!l.duration && l.direction === 'inbound');
          const isOut = l.direction === 'outbound';
          const ini = getInitials(name);
          const isActive = selectedId === 'l_' + l.id;
          return (
            <div key={l.id} onClick={() => onSelect({ type:'log', data:l, id:'l_'+l.id })}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderLeft:'2px solid', borderLeftColor: isActive ? '#3b82f6' : 'transparent', background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent', transition:'all 0.15s' }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:avatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#fff', flexShrink:0 }}>{ini}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>{name}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{num}{l.duration > 0 ? ' · ' + Math.floor(l.duration/60) + ':' + String(l.duration%60).padStart(2,'0') : isMissed ? ' · missed' : ''}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:'0.68rem', color:'rgba(100,140,180,0.45)' }}>{fmtLogTime(l.started_at || l.created_at)}</div>
                <div style={{ marginTop:4, fontSize:'0.85rem', color: isMissed ? '#ef4444' : isOut ? '#3b82f6' : '#10b981' }}>
                  {isMissed ? '✕' : isOut ? '↗' : '↙'}
                </div>
              </div>
            </div>
          );
        })}
        {logItems.length === 0 && contactItems.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:'rgba(100,140,180,0.45)', fontSize:'0.82rem' }}>No items</div>
        )}
      </div>
    </div>
  );
}

// ─── Contact Detail (shown in detail panel when a list item is selected) ──────
function ContactDetailView({ item, onCall, onMessage, onVideo }) {
  const { type, data } = item;
  const isLog = type === 'log';
  const name = isLog ? (data.from_name || data.to_name || (data.direction === 'inbound' ? data.from_number : data.to_number) || 'Unknown') : (data.name || data.phone);
  const phone = isLog ? (data.direction === 'inbound' ? data.from_number : data.to_number) : data.phone;
  const role = isLog ? (data.direction === 'inbound' ? 'Incoming call' : 'Outgoing call') : (data.company || '');
  const ini = getInitials(name);
  const aColor = avatarColor(name);

  const actionBtn = (label, bg, color, border, onClick) => (
    <button onClick={onClick} title={label} style={{ width:44, height:44, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border, cursor:'pointer', background:bg, color, transition:'all 0.2s' }}>
      {label === 'Call' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>}
      {label === 'Video' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>}
      {label === 'SMS' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/></svg>}
      {label === 'Email' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>}
    </button>
  );

  return (
    <div style={{ padding:'28px 32px', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:aColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', fontWeight:700, color:'#fff', boxShadow:'0 4px 24px rgba(59,130,246,0.25)' }}>{ini}</div>
        <div>
          <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#e2e8f0' }}>{name}</div>
          <div style={{ fontSize:'0.82rem', color:'#c8d6e5', marginTop:2 }}>{role}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:28 }}>
        {actionBtn('Call', 'linear-gradient(135deg,#10b981,#059669)', '#fff', 'none', () => onCall(phone, name))}
        {actionBtn('Video', 'rgba(59,130,246,0.15)', '#60a5fa', '1px solid rgba(59,130,246,0.15)', onVideo)}
        {actionBtn('SMS', 'rgba(167,139,250,0.12)', '#a78bfa', '1px solid rgba(167,139,250,0.12)', () => onMessage(phone))}
        {actionBtn('Email', 'rgba(251,191,36,0.12)', '#fbbf24', '1px solid rgba(251,191,36,0.12)', () => data.email && window.open('mailto:' + data.email))}
      </div>
      <div style={{ fontSize:'0.65rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(100,140,180,0.35)', marginBottom:12 }}>Contact Information</div>
      <div style={{ marginBottom:28 }}>
        {phone && <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(80,120,200,0.06)' }}>
          <span style={{ color:'rgba(100,140,180,0.45)', width:22, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg></span>
          <span style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', width:60 }}>Phone</span>
          <span style={{ fontSize:'0.82rem', color:'#e2e8f0' }}>{phone}</span>
        </div>}
        {data.email && <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(80,120,200,0.06)' }}>
          <span style={{ color:'rgba(100,140,180,0.45)', width:22, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg></span>
          <span style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', width:60 }}>Email</span>
          <span style={{ fontSize:'0.82rem', color:'#e2e8f0' }}>{data.email}</span>
        </div>}
      </div>
      {isLog && data.transcript && (
        <>
          <div style={{ fontSize:'0.65rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(100,140,180,0.35)', marginBottom:12 }}>Transcript</div>
          <div style={{ padding:14, borderRadius:12, background:'rgba(12,18,35,0.6)', border:'1px solid rgba(80,120,200,0.08)', fontSize:'0.78rem', color:'#c8d6e5', lineHeight:1.7 }}>{data.transcript}</div>
        </>
      )}
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
function AIPanel({ summary, tasks, phone }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role:'user', text: msg }]);
    setLoading(true);
    try {
      const context = summary ? 'Last call summary: ' + summary : '';
      const data = await api.askAI(context ? context + '\n\nUser: ' + msg : msg);
      setMessages(prev => [...prev, { role:'ai', text: data.response || 'No response' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:'ai', text: 'Error: ' + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: 'Draft follow-up email', icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75' },
    { label: 'Suggest response to missed call', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' },
    { label: 'Summarize recent calls', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75' },
  ];

  return (
    <div style={{ width:280, minWidth:280, borderLeft:'1px solid rgba(80,120,200,0.08)', display:'flex', flexDirection:'column', overflowY:'auto', padding:'20px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa', display:'inline-block', animation:'pulse-ai 2s infinite', boxShadow:'0 0 0 0 rgba(167,139,250,0.4)' }}></span>
        <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>AI Assistant</span>
      </div>
      {summary && (
        <div style={{ padding:14, borderRadius:12, background:'rgba(12,18,35,0.6)', border:'1px solid rgba(80,120,200,0.08)', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"/></svg>
            <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0' }}>Call Summary</span>
          </div>
          <p style={{ fontSize:'0.78rem', color:'#c8d6e5', lineHeight:1.7, margin:0 }}>{summary}</p>
        </div>
      )}
      {tasks.length > 0 && (
        <div style={{ padding:14, borderRadius:12, background:'rgba(12,18,35,0.6)', border:'1px solid rgba(80,120,200,0.08)', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"/></svg>
            <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0' }}>Suggested Tasks</span>
          </div>
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {tasks.map((t, i) => <li key={i} style={{ fontSize:'0.78rem', color:'#c8d6e5', padding:'4px 0', display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:'0.7rem', color:'rgba(100,140,180,0.45)' }}>☐</span>{t}</li>)}
          </ul>
        </div>
      )}
      <div style={{ marginTop:12 }}>
        {suggestions.map(s => (
          <button key={s.label} onClick={() => setInput(s.label)} style={{ display:'block', width:'100%', padding:'9px 12px', marginBottom:8, fontSize:'0.75rem', color:'#c4b5fd', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.1)', borderRadius:8, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display:'inline', verticalAlign:'middle', marginRight:6 }}><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
            {s.label}
          </button>
        ))}
      </div>
      {messages.length > 0 && (
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius:10, background: m.role === 'user' ? 'rgba(59,130,246,0.12)' : 'rgba(167,139,250,0.08)', fontSize:'0.78rem', color: m.role === 'user' ? '#93c5fd' : '#c8d6e5', lineHeight:1.6 }}>{m.text}</div>
          ))}
          {loading && <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(167,139,250,0.08)', fontSize:'0.78rem', color:'rgba(167,139,250,0.6)' }}>Thinking…</div>}
        </div>
      )}
      <div style={{ marginTop:'auto', display:'flex', gap:8, paddingTop:12 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask AI anything..." style={{ flex:1, padding:'9px 12px', fontSize:'0.78rem', color:'#e2e8f0', background:'rgba(15,22,40,0.5)', border:'1px solid rgba(80,120,200,0.1)', borderRadius:8, outline:'none' }} />
        <button onClick={send} disabled={loading} style={{ width:36, height:36, borderRadius:8, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#a78bfa,#7c3aed)', color:'#fff', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>
        </button>
      </div>
    </div>
  );
}

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/[\s@]/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// Format raw transcript into readable paragraphs by splitting on sentence boundaries
function formatTranscript(text) {
  if (!text) return '';
  // Split on sentence-ending punctuation followed by space, or on common speech-to-text patterns
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/\b(hello|hi|hey|okay|all right|so where|so can|you're)\b/gi, '\n$1')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  // Group into paragraphs of ~3-4 sentences
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(' '));
  }
  return paragraphs;
}

// Transcript display component with formatted text
function TranscriptBlock({ text, maxHeight = '200px' }) {
  const paragraphs = formatTranscript(text);
  return (
    <div style={{ maxHeight, overflowY: 'auto', scrollbarWidth: 'thin' }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0', fontSize: '12px', color: '#9ca3af', lineHeight: 1.7 }}>{p}</p>
      ))}
    </div>
  );
}

// Audio player with progress bar, seek, download, share, and speed controls
function RecordingPlayer({ recordingId, isPlaying, onToggle, audioRef }) {
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);   // 0-1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressInterval = useRef(null);
  const speeds = [1, 1.5, 2];
  const url = api.streamRecording(recordingId);

  // Track playback progress
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        const a = audioRef.current;
        if (a && a.duration && isFinite(a.duration)) {
          setProgress(a.currentTime / a.duration);
          setCurrentTime(a.currentTime);
          setDuration(a.duration);
        }
      }, 200);
    } else {
      clearInterval(progressInterval.current);
      if (!isPlaying) setProgress(0);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying, audioRef]);

  const fmtTime = (secs) => {
    if (!secs || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  const seek = (e) => {
    e.stopPropagation();
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
      setProgress(pct);
    }
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const download = (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${recordingId}.webm`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const share = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try { await navigator.share({ title: 'Call Recording', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', flexShrink: 0, cursor: 'pointer', color: '#60a5fa', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={isPlaying ? 'Stop' : 'Play'}>
          {isPlaying ? '⏹' : '▶'}
        </button>
        <button onClick={cycleSpeed}
          style={{ background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', color: speed > 1 ? '#60a5fa' : '#6b84a8', fontSize: '10px', fontWeight: 700, minWidth: '32px' }}
          title="Playback speed">
          {speed}x
        </button>
        <button onClick={download}
          style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Download">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button onClick={share}
          style={{ background: 'rgba(139,92,246,0.1)', border: 'none', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Share / Copy link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>
      {/* Progress bar with seek */}
      {isPlaying && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 2px' }}>
          <span style={{ fontSize: '9px', color: '#6b84a8', minWidth: '28px', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(currentTime)}</span>
          <div
            onClick={seek}
            style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            title="Click to seek"
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: (progress * 100) + '%',
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              borderRadius: '3px',
              transition: 'width 0.15s linear',
            }} />
            <div style={{
              position: 'absolute', top: '-2px',
              left: `calc(${progress * 100}% - 5px)`,
              width: '10px', height: '10px',
              borderRadius: '50%', background: '#60a5fa',
              boxShadow: '0 0 4px rgba(96,165,250,0.5)',
              transition: 'left 0.15s linear',
            }} />
          </div>
          <span style={{ fontSize: '9px', color: '#6b84a8', minWidth: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(duration)}</span>
        </div>
      )}
    </div>
  );
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
                <RecordingPlayer
                  recordingId={rec.id}
                  isPlaying={isPlaying}
                  onToggle={() => toggle(rec)}
                  audioRef={audioRef}
                />
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
                    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px' }}>
                      <p style={{ margin:'0 0 6px', fontSize:'10px', color:'#6b84a8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Transcript</p>
                      <TranscriptBlock text={rec.transcript} maxHeight="160px" />
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
                  <TranscriptBlock text={log.transcript} maxHeight="300px" />
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
  const [vmUnread, setVmUnread] = useState(0);
  const [msgUnread] = useState(3);
  const [messageTo, setMessageTo] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiTasks, setAiTasks] = useState([]);

  useEffect(() => {
    api.getVoicemails().then(vms => setVmUnread(vms.filter(v => !v.is_read).length)).catch(() => {});
    api.getCallLogs().then(data => setCallLogs(Array.isArray(data) ? data : (data?.call_logs || []))).catch(() => {});
    api.getContacts().then(cs => { if (Array.isArray(cs)) setContacts(cs); }).catch(() => {});
  }, []);

  // Fetch AI insight after call ends
  const prevStatus = useRef(phone.status);
  useEffect(() => {
    if (prevStatus.current !== 'ready' && phone.status === 'ready') {
      api.getCallLogs().then(data => {
        const logs = Array.isArray(data) ? data : (data?.call_logs || []);
        setCallLogs(logs);
        const last = logs[0];
        if (last?.ai_summary) { setAiSummary(last.ai_summary); try { setAiTasks(JSON.parse(last.tasks || '[]')); } catch { setAiTasks([]); } }
      }).catch(() => {});
    }
    prevStatus.current = phone.status;
  }, [phone.status]);

  const handleNavChange = (id) => {
    if (id === 'video') { window.open('https://meet.stproperties.com', '_blank'); return; }
    if (id === 'phone') { setDialTo(''); setDialName(''); }
    setActiveNav(id);
  };

  const handleNewCall = () => { setDialTo(''); setDialName(''); setActiveNav('dialpad'); };
  const handleCallBack = (number, name) => { setDialTo(number); setDialName(name || number); setActiveNav('voice'); };
  const handleDialDirect = (number) => { setDialTo(number); setDialName(number); setActiveNav('voice'); };
  const handleCallFromDetail = (num, name) => { setDialTo(num); setDialName(name || num); setActiveNav('voice'); };
  const handleMessageFromDetail = (num) => { setMessageTo(num); setActiveNav('messages'); };

  const inbound = phone.inboundCall;

  // Determine detail panel content
  const showContactDetail = selectedItem && activeNav !== 'voice';

  const mobileTabActive = activeNav === 'voice' ? 'phone' : ['phone','messages','contacts'].includes(activeNav) ? activeNav : 'more';
  const mobileLabel = ({ phone:'Phone', voice:'Phone', messages:'Text', contacts:'Contacts', history:'Recents', voicemail:'Voicemail', more:'More' })[activeNav] || 'Phone';
  const userInitials = ((user?.name || user?.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2));

  return (
    <div style={{ height:'100vh', background:'#0a0e1a', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif", color:'#e2e8f0' }}>
      <style>{`@keyframes pulse-ai { 0%,100%{ box-shadow:0 0 0 0 rgba(167,139,250,0.4); } 50%{ box-shadow:0 0 0 6px rgba(167,139,250,0); } }`}</style>

      {/* ── DESKTOP layout (≥640px) ─────────────────────── */}
      <div className="hidden sm:flex" style={{ height:'100%' }}>
      {/* Sidebar */}
      <SidebarComp activeNav={activeNav} setActiveNav={handleNavChange} user={user} onLogout={logout} vmUnread={vmUnread} msgUnread={msgUnread} onNewCall={handleNewCall} />

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <TopBarComp search={search} setSearch={setSearch} user={user} />

        {/* Content area */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* List panel — always visible */}
          <ListPanelComp
            activeNav={activeNav}
            callLogs={callLogs}
            contacts={contacts}
            selectedId={selectedItem?.id}
            onSelect={setSelectedItem}
          />

          {/* Detail panel */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {showContactDetail ? (
              <div style={{ flex:1, overflowY:'auto' }}>
                <ContactDetailView item={selectedItem} onCall={handleCallFromDetail} onMessage={handleMessageFromDetail} onVideo={() => window.open('https://meet.stproperties.com', '_blank')} />
              </div>
            ) : activeNav === 'voice' ? (
              <VoiceCall phone={phone} dialTo={dialTo} dialName={dialName} onHangup={() => setActiveNav('phone')} />
            ) : activeNav === 'phone' ? (
              <PhoneScreen phone={phone} user={user} onDial={handleDialDirect} onCallBack={handleCallBack} vmUnread={vmUnread} />
            ) : activeNav === 'dialpad' ? (
              <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}><Dialpad phone={phone} onDial={handleDialDirect} /></div>
            ) : activeNav === 'messages' ? (
              <Messaging initialTo={messageTo} />
            ) : activeNav === 'video' ? (
              <VideoCall />
            ) : activeNav === 'contacts' ? (
              <ContactsView onCall={c => handleCallFromDetail(c.phone, c.name)} onMessage={c => handleMessageFromDetail(c.phone)} />
            ) : activeNav === 'history' ? (
              <CallHistory onCallBack={handleCallBack} />
            ) : activeNav === 'voicemail' ? (
              <VoicemailList onCallBack={handleCallBack} />
            ) : activeNav === 'recordings' ? (
              <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}><RecordingsList /></div>
            ) : activeNav === 'channels' ? (
              <ChannelsView />
            ) : activeNav === 'team' ? (
              <TeamView />
            ) : activeNav === 'meetings' ? (
              <MeetingScheduler />
            ) : activeNav === 'analytics' ? (
              <AnalyticsDashboard />
            ) : activeNav === 'wallboard' ? (
              <WallboardView />
            ) : activeNav === 'supervisor' ? (
              <SupervisorPanel />
            ) : activeNav === 'ivr' ? (
              <IVRBuilder />
            ) : activeNav === 'ai-receptionist' ? (
              <AIReceptionist />
            ) : activeNav === 'sms-campaign' ? (
              <SMSCampaign />
            ) : activeNav === 'business-hours' ? (
              <BusinessHours />
            ) : activeNav === 'admin' ? (
              <AdminPanel />
            ) : (
              <PhoneScreen phone={phone} user={user} onDial={handleDialDirect} onCallBack={handleCallBack} vmUnread={vmUnread} />
            )}
          </div>

          {/* AI Panel */}
          <AIPanel summary={aiSummary} tasks={aiTasks} phone={phone} />
        </div>
      </div>
      </div>{/* end hidden sm:flex desktop wrapper */}

      {/* ── MOBILE layout (<640px) ─────────────────────── */}
      <div className="sm:hidden" style={{ height:'100%', display:'flex', flexDirection:'column', background:'#0a0e1a' }}>
        {/* Mobile header — 56px */}
        <div style={{ height:56, flexShrink:0, background:'#0f1629', borderBottom:'1px solid #1a2744', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#2d6a9f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#7dd3fc' }}>
            {userInitials}
          </div>
          <span style={{ fontWeight:600, fontSize:16, color:'#e2e8f0' }}>{mobileLabel}</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {phone.status === 'registered' ? (
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80' }} title="Connected" />
            ) : (
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#f87171' }} title="Disconnected" />
            )}
            <button onClick={() => setActiveNav('more')} style={{ background:'none', border:'none', color:'#6b84a8', cursor:'pointer', padding:4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
        </div>

        {/* Mobile content */}
        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          {activeNav === 'voice' ? (
            <VoiceCall phone={phone} dialTo={dialTo} dialName={dialName} onHangup={() => setActiveNav('phone')} />
          ) : activeNav === 'messages' ? (
            <Messaging initialTo={messageTo} />
          ) : activeNav === 'contacts' ? (
            <ContactsView onCall={c => handleCallFromDetail(c.phone, c.name)} onMessage={c => handleMessageFromDetail(c.phone)} />
          ) : activeNav === 'history' ? (
            <CallHistory onCallBack={handleCallBack} />
          ) : activeNav === 'voicemail' ? (
            <VoicemailList onCallBack={handleCallBack} />
          ) : activeNav === 'more' ? (
            <MoreSettings user={user} onLogout={logout} />
          ) : (
            <PhoneScreen phone={phone} user={user} onDial={handleDialDirect} onCallBack={handleCallBack} vmUnread={vmUnread} />
          )}
        </div>

        {/* Mobile bottom nav — 64px */}
        <div style={{ height:64, flexShrink:0, background:'#0f1629', borderTop:'1px solid #1a2744', display:'flex', alignItems:'center', justifyContent:'space-around', paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
          {[
            { id:'phone', label:'Phone', badge: vmUnread > 0 ? vmUnread : 0, icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.12 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
            )},
            { id:'messages', label:'Text', badge: msgUnread > 0 ? msgUnread : 0, icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            )},
            { id:'contacts', label:'Contacts', badge:0, icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            )},
            { id:'more', label:'More', badge:0, icon: (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )},
          ].map(tab => {
            const isActive = mobileTabActive === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveNav(tab.id === 'phone' ? 'voice' : tab.id)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', cursor:'pointer', color: isActive ? '#3b82f6' : '#6b84a8', position:'relative', height:'100%' }}>
                <div style={{ position:'relative' }}>
                  {tab.icon}
                  {tab.badge > 0 && (
                    <span style={{ position:'absolute', top:-4, right:-6, background:'#ef4444', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{tab.badge > 9 ? '9+' : tab.badge}</span>
                  )}
                </div>
                <span style={{ fontSize:10, fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
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

    </div>
  );
}
