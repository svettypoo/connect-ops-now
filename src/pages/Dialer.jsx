import { useState, useEffect, useRef } from 'react';
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

import SidebarComp from './dialer/SidebarComp';
import TopBarComp from './dialer/TopBarComp';
import ListPanelComp from './dialer/ListPanelComp';
import ContactDetailView from './dialer/ContactDetailView';
import AIPanel from './dialer/AIPanel';
import PhoneScreen from './dialer/PhoneScreen';
import ContactsView from './dialer/ContactsView';
import RecordingsList from './dialer/RecordingsList';
import MoreSettings from './dialer/MoreSettings';
import FloatingCallWidget from '@/components/dialer/FloatingCallWidget';
import FloatingIncomingCall from '@/components/dialer/FloatingIncomingCall';

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

      {/* Floating call widget — visible when on a call but navigated away from voice screen */}
      {(phone.status === 'active' || phone.status === 'held' || phone.status === 'calling') && activeNav !== 'voice' && (
        <FloatingCallWidget
          phone={phone}
          onExpand={() => setActiveNav('voice')}
        />
      )}

      {/* Floating incoming call popup — vibrates, stacks above active call widget */}
      {inbound && (
        <FloatingIncomingCall
          inbound={inbound}
          onAnswer={() => { phone.answerCall(); setActiveNav('voice'); }}
          onDecline={() => phone.hangup()}
        />
      )}

    </div>
  );
}
