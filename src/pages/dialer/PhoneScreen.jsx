import { useState } from 'react';
import Dialpad from '@/components/dialer/Dialpad';
import CallHistory from '@/components/dialer/CallHistory';
import VoicemailList from '@/components/dialer/VoicemailList';
import TranscriptsList from './TranscriptsList';
import RecordingsList from './RecordingsList';

// PhoneScreen: sub-tabs (Keypad, Calls, Voicemail, Transcripts, Recordings)
export default function PhoneScreen({ phone, user, onDial, onCallBack, vmUnread }) {
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
