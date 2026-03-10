import { useState } from "react";
import RCSidebar from "@/components/rc/RCSidebar";
import RCContactPanel from "@/components/rc/RCContactPanel";
import RCListPanel from "@/components/rc/RCListPanel";
import VoiceCall from "@/components/dialer/VoiceCall";
import VideoCall from "@/components/dialer/VideoCall";
import Messaging from "@/components/dialer/Messaging";
import Dialpad from "@/components/dialer/Dialpad";
import CallHistory from "@/components/dialer/CallHistory";
import VoicemailList from "@/components/dialer/VoicemailList";
import { usePhone } from "@/lib/usePhone";

export default function Dialer() {
  const [activeNav, setActiveNav] = useState("dialpad");
  const [selectedContact, setSelectedContact] = useState(null);
  const [pendingCall, setPendingCall] = useState(null); // { number, name }
  const [pendingVideo, setPendingVideo] = useState(null);
  const [vmUnread, setVmUnread] = useState(0);
  const phone = usePhone();

  const handleCallBack = (number, name) => {
    setPendingCall({ number, name });
    setActiveNav("voice");
  };

  const handleContactCall = (number, name) => {
    setPendingCall({ number, name });
    setActiveNav("voice");
  };

  const handleContactVideo = (name) => {
    setPendingVideo(name);
    setActiveNav("video");
  };

  const handleContactMessage = (contact) => {
    setSelectedContact(contact);
    setActiveNav("message");
  };

  const renderMain = () => {
    switch (activeNav) {
      case "dialpad":
        return (
          <Dialpad
            onCall={(number, name) => { setPendingCall({ number, name }); setActiveNav("voice"); }}
            phoneStatus={phone.status}
            phoneNumber={phone.phoneNumber}
          />
        );
      case "recent":
        return <CallHistory onCallBack={handleCallBack} />;
      case "voicemail":
        return <VoicemailList onCallBack={handleCallBack} />;
      case "voice":
        return (
          <VoiceCall
            dialTo={pendingCall?.number}
            dialName={pendingCall?.name}
            onCallEnd={() => setPendingCall(null)}
          />
        );
      case "video":
        return <VideoCall contactName={pendingVideo || selectedContact?.name} />;
      case "message":
        return (
          <Messaging
            initialThread={selectedContact?.from_number ? selectedContact : null}
          />
        );
      case "contacts":
        return <div className="p-4 text-slate-400 text-sm">Select a contact from the list</div>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .rc-glass { background: rgba(255,255,255,0.03); }
        .rc-hover:hover { background: rgba(255,255,255,0.07); }
        .rc-active { background: rgba(255,255,255,0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>

      <RCSidebar activeNav={activeNav} setActiveNav={setActiveNav} vmUnread={vmUnread} />

      {activeNav !== "dialpad" && activeNav !== "voice" && activeNav !== "video" && (
        <RCListPanel activeNav={activeNav} selectedContact={selectedContact} setSelectedContact={setSelectedContact} />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#1e1e30] overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#1e1e30] min-h-[52px]">
            <div className="flex items-center gap-3">
              {selectedContact ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-sm font-bold">
                    {(selectedContact.name||"?")[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{selectedContact.name}</p>
                    <p className="text-[10px] text-green-400">● {selectedContact.status === "active" ? "Active now" : "Offline"}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${phone.status === "ready" || phone.status === "active" ? "bg-green-400 animate-pulse" : phone.status === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-slate-600"}`} />
                  <span className="text-slate-400 text-sm capitalize">{phone.status}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedContact && activeNav === "message" && (
                <>
                  <button onClick={() => handleContactCall(selectedContact.phone || selectedContact.from_number || "", selectedContact.name)}
                    className="p-2 rounded-lg rc-hover transition-all" title="Voice call">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </button>
                  <button onClick={() => handleContactVideo(selectedContact.name)}
                    className="p-2 rounded-lg rc-hover transition-all" title="Video call">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 10l4.55-2.35A1 1 0 0121 8.58v6.84a1 1 0 01-1.45.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Inbound call banner */}
          {phone.inboundCall && (
            <div className="mx-4 mt-3 px-4 py-3 bg-green-900/30 border border-green-500/30 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Incoming call</p>
                <p className="text-xs text-green-400">{phone.inboundCall.name} — {phone.inboundCall.number}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { phone.answerCall(); setActiveNav("voice"); }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold">Answer</button>
                <button onClick={phone.hangup}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">Decline</button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {renderMain()}
          </div>
        </div>

        {selectedContact && activeNav !== "dialpad" && (
          <RCContactPanel
            contact={selectedContact}
            onCall={handleContactCall}
            onVideo={handleContactVideo}
            onMessage={handleContactMessage}
          />
        )}
      </div>
    </div>
  );
}
