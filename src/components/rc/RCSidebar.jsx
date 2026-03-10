import { useState } from 'react';
import { MessageSquare, Phone, Video, Users, Settings, Bell, BarChart2, Monitor, GitBranch, Bot, Megaphone, Headphones, Clock, Shield, Hash, Calendar, Voicemail } from 'lucide-react';

const MAIN_NAV = [
  { id: 'message',  icon: MessageSquare, label: 'Messages' },
  { id: 'voice',    icon: Phone,          label: 'Phone' },
  { id: 'video',    icon: Video,           label: 'Video' },
  { id: 'contacts', icon: Users,           label: 'Contacts' },
];

const MORE_NAV = [
  { id: 'dialpad',         icon: Hash,          label: 'Dialpad' },
  { id: 'recent',          icon: Phone,          label: 'Call History' },
  { id: 'voicemail',       icon: Voicemail,      label: 'Voicemail' },
  { id: 'dm',              icon: MessageSquare,  label: 'Direct Messages' },
  { id: 'channels',        icon: Hash,           label: 'Channels' },
  { id: 'team',            icon: Users,          label: 'Team' },
  { id: 'meetings',        icon: Calendar,       label: 'Meetings' },
  null,
  { id: 'analytics',       icon: BarChart2,      label: 'Analytics' },
  { id: 'wallboard',       icon: Monitor,        label: 'Wallboard' },
  { id: 'supervisor',      icon: Headphones,     label: 'Supervisor' },
  { id: 'sms-campaign',    icon: Megaphone,      label: 'SMS Campaigns' },
  null,
  { id: 'ivr',             icon: GitBranch,      label: 'IVR Builder' },
  { id: 'ai-receptionist', icon: Bot,            label: 'AI Receptionist' },
  { id: 'business-hours',  icon: Clock,          label: 'Business Hours' },
  { id: 'admin',           icon: Shield,         label: 'Admin' },
];

export default function RCSidebar({ activeNav, setActiveNav, user, onLogout, vmUnread = 0 }) {
  const [showMore, setShowMore] = useState(false);

  const go = (id) => { setActiveNav(id); setShowMore(false); };

  const isMainActive = MAIN_NAV.some(n => n.id === activeNav);

  return (
    <div className="w-[60px] flex flex-col items-center py-3 gap-1 bg-[#141428] border-r border-white/5 relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`.rc-sidebar-hover:hover { background: rgba(255,255,255,0.07); }`}</style>

      {/* Orange "R" logo */}
      <div className="w-9 h-9 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C38)' }}>
        <span className="font-black text-white text-lg">R</span>
      </div>

      {/* 4 main nav items */}
      {MAIN_NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => go(id)}
          title={label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative group ${
            activeNav === id ? 'bg-[#0684BD]/20 text-[#0EB8FF]' : 'text-slate-500 hover:text-slate-300 rc-sidebar-hover'
          }`}
        >
          {activeNav === id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#0EB8FF]" />}
          <Icon className="w-5 h-5" />
          <span className="absolute left-14 bg-[#2a2a45] text-xs text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {label}
          </span>
        </button>
      ))}

      <div className="flex-1" />

      {/* Bell → voicemail */}
      <button
        onClick={() => go('voicemail')}
        title="Voicemail"
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group rc-sidebar-hover ${
          activeNav === 'voicemail' ? 'bg-[#0684BD]/20 text-[#0EB8FF]' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Bell className="w-5 h-5" />
        {vmUnread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{vmUnread}</span>
        )}
        <span className="absolute left-14 bg-[#2a2a45] text-xs text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">Voicemail</span>
      </button>

      {/* Settings → flyout */}
      <div className="relative">
        <button
          onClick={() => setShowMore(v => !v)}
          title="More"
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group rc-sidebar-hover ${
            showMore || (!isMainActive && activeNav !== 'voicemail') ? 'bg-[#0684BD]/20 text-[#0EB8FF]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="absolute left-14 bg-[#2a2a45] text-xs text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">More</span>
        </button>

        {showMore && (
          <div className="absolute left-14 bottom-0 w-52 bg-[#1e1e38] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
            {MORE_NAV.map((item, i) =>
              !item ? (
                <div key={i} className="border-t border-white/5 my-1" />
              ) : (
                <button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all ${
                    activeNav === item.id ? 'text-[#0EB8FF] bg-[#0684BD]/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full mt-1 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80 transition"
        onClick={onLogout} title="Logout">
        {(user?.name || user?.email || 'U')[0].toUpperCase()}
      </div>
    </div>
  );
}
