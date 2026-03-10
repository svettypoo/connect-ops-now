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

const HAS_LIST = ['message','recent','contacts','voicemail','video','channels'];

export default function Dialer() {
  const { user, logout } = useAuth();
  const phone = usePhone();
  const [activeNav, setActiveNav] = useState('dialpad');
  const [dialTo, setDialTo] = useState('');
  const [dialName, setDialName] = useState('');
  const [activeContact, setActiveContact] = useState(null);
  const [vmUnread, setVmUnread] = useState(0);
  const [messageTo, setMessageTo] = useState('');

  useEffect(() => {
    api.getVoicemails().then(vms => setVmUnread(vms.filter(v => !v.is_read).length)).catch(() => {});
  }, [activeNav]);

  const callContact = (c) => { setDialTo(c.phone); setDialName(c.name||c.phone); setActiveNav('voice'); };
  const videoContact = (c) => { setActiveNav('video'); };
  const messageContact = (c) => { setMessageTo(c.phone); setActiveNav('message'); };

  const handleCallBack = (number, name) => { setDialTo(number); setDialName(name||number); setActiveNav('voice'); };
  const handleDialDirect = (number) => { setDialTo(number); setDialName(number); setActiveNav('voice'); };

  const inbound = phone.inboundCall;

  const showList = HAS_LIST.includes(activeNav);

  return (
    <div className="flex h-screen bg-[#0f0f23] overflow-hidden">
      <RCSidebar activeNav={activeNav} setActiveNav={setActiveNav} user={user} onLogout={logout} vmUnread={vmUnread}/>

      {showList && (
        <RCListPanel activeNav={activeNav} onSelectContact={c => { setActiveContact(c); }}
          onCallBack={handleCallBack} onSelectMessage={num => { setMessageTo(num); setActiveNav('message'); }}/>
      )}

      {/* Inbound call banner */}
      {inbound && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1e1e3a] border border-blue-500/50 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl animate-bounce-once">
          <div>
            <div className="text-xs text-blue-400 font-semibold uppercase">Incoming Call</div>
            <div className="text-white font-bold text-lg">{inbound.callerNumber}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => phone.answerCall()} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold transition">Answer</button>
            <button onClick={() => phone.hangup()} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-semibold transition">Decline</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeNav === 'dialpad' && (
            <Dialpad phone={phone} onDial={handleDialDirect}/>
          )}
          {activeNav === 'voice' && (
            <VoiceCall phone={phone} dialTo={dialTo} dialName={dialName} onHangup={() => setActiveNav('recent')}/>
          )}
          {activeNav === 'video' && <VideoCall/>}
          {activeNav === 'message' && <Messaging initialTo={messageTo}/>}
          {activeNav === 'recent' && <CallHistory onCallBack={handleCallBack}/>}
          {activeNav === 'voicemail' && <VoicemailList onCallBack={handleCallBack}/>}
          {activeNav === 'contacts' && (
            <div className="h-full flex items-center justify-center flex-col gap-3 text-gray-500 text-sm">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-30"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <p className="text-gray-400">Select a contact from the list, or add a new one</p>
            </div>
          )}
          {activeNav === 'analytics' && <AnalyticsDashboard/>}
          {activeNav === 'channels' && <ChannelsView/>}
          {activeNav === 'wallboard' && <WallboardView/>}
          {activeNav === 'ivr' && <IVRBuilder/>}
          {activeNav === 'admin' && <AdminPanel/>}
          {activeNav === 'ai-receptionist' && <AIReceptionist/>}
          {activeNav === 'sms-campaign' && <SMSCampaign/>}
          {activeNav === 'supervisor' && <SupervisorPanel/>}
          {activeNav === 'business-hours' && <BusinessHours/>}
          {activeNav === 'meetings' && <MeetingScheduler/>}
          {activeNav === 'team' && <TeamView/>}
        </div>

        {activeContact && HAS_LIST.includes(activeNav) && (
          <RCContactPanel contact={activeContact} onClose={() => setActiveContact(null)}
            onCall={() => callContact(activeContact)}
            onVideo={() => videoContact(activeContact)}
            onSms={() => messageContact(activeContact)}
            onEmail={() => window.open('mailto:' + activeContact.email)}/>
        )}
      </div>
    </div>
  );
}
