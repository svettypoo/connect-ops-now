import { useState } from 'react';
import { getInitials } from './utils';
import {
  IncomingCallIcon, AutoReplyIcon, AddPersonIcon,
  MessageIcon, VideoIcon, PhoneTabIcon, VoicemailIcon,
  NotificationsIcon, HeadphonesIcon, ContactsBookIcon,
  SignOutIcon, ChevronRight,
} from './icons';
import AudioDeviceSettings from './AudioDeviceSettings';

// MoreSettings: vertical scrollable settings/profile list — matches real RC "More" tab
export default function MoreSettings({ user, onLogout, onNavigate }) {
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
