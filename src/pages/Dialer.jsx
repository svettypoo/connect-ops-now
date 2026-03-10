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
import AnalyticsDashboard from '@/components/dialer/AnalyticsDashboard';
import ChannelsView from '@/components/dialer/ChannelsView';
import WallboardView from '@/components/dialer/WallboardView';
import IVRBuilder from '@/components/dialer/IVRBuilder';
import AdminPanel from '@/components/dialer/AdminPanel';
import AIReceptionist from '@/components/dialer/AIReceptionist';
import SMSCampaign from '@/components/dialer/SMSCampaign';
import SupervisorPanel from '@/components/dialer/SupervisorPanel';

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
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Select a contact from the list</div>
          )}
          {activeNav === 'analytics' && <AnalyticsDashboard/>}
          {activeNav === 'channels' && <ChannelsView/>}
          {activeNav === 'wallboard' && <WallboardView/>}
          {activeNav === 'ivr' && <IVRBuilder/>}
          {activeNav === 'admin' && <AdminPanel/>}
          {activeNav === 'ai-receptionist' && <AIReceptionist/>}
          {activeNav === 'sms-campaign' && <SMSCampaign/>}
          {activeNav === 'supervisor' && <SupervisorPanel/>}
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
