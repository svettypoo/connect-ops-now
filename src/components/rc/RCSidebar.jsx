import { Phone, MessageSquare, Voicemail, Video, Users, Hash, BarChart2, Shield, Monitor, GitBranch, Bot, Megaphone, Headphones, Calendar, Clock } from 'lucide-react';

const NAV = [
  { id: 'dialpad', icon: Hash, label: 'Dialpad' },
  { id: 'recent', icon: Phone, label: 'Calls' },
  { id: 'voicemail', icon: Voicemail, label: 'Voicemail' },
  { id: 'message', icon: MessageSquare, label: 'SMS' },
  { id: 'channels', icon: MessageSquare, label: 'Channels', iconClass: 'text-indigo-400' },
  { id: 'video', icon: Video, label: 'Video' },
  { id: 'contacts', icon: Users, label: 'Contacts' },
  { id: 'meetings', icon: Calendar, label: 'Meetings' },
  { id: 'team', icon: Hash, label: 'Team', iconClass: 'text-indigo-400' },
  null, // divider
  { id: 'analytics', icon: BarChart2, label: 'Analytics', iconClass: 'text-blue-400' },
  { id: 'wallboard', icon: Monitor, label: 'Wallboard', iconClass: 'text-green-400' },
  { id: 'supervisor', icon: Headphones, label: 'Supervisor', iconClass: 'text-orange-400' },
  { id: 'sms-campaign', icon: Megaphone, label: 'Campaigns', iconClass: 'text-yellow-400' },
  null, // divider
  { id: 'ivr', icon: GitBranch, label: 'IVR', iconClass: 'text-purple-400' },
  { id: 'ai-receptionist', icon: Bot, label: 'AI Desk', iconClass: 'text-purple-400' },
  { id: 'business-hours', icon: Clock, label: 'Hours', iconClass: 'text-teal-400' },
  { id: 'admin', icon: Shield, label: 'Admin', iconClass: 'text-red-400' },
  { id: 'business-hours', icon: Clock, label: 'Hours', iconClass: 'text-teal-400' },
  { id: 'meetings', icon: Calendar, label: 'Meetin', iconClass: 'text-sky-400' },
];

export default function RCSidebar({ activeNav, setActiveNav, user, onLogout, vmUnread = 0 }) {
  return (
    <div className="w-16 bg-[#111126] flex flex-col items-center py-4 gap-1 border-r border-[#1e1e3a]">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm mb-3">C</div>

      <div className="flex-1 flex flex-col items-center gap-0.5 w-full overflow-y-auto">
        {NAV.map((item, i) => {
          if (!item) return <div key={i} className="w-8 border-t border-[#1e1e3a] my-1"/>;
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button key={item.id} onClick={() => setActiveNav(item.id)} title={item.label}
              className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${active ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:bg-[#1e1e3a] hover:text-gray-300'}`}>
              {active && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-r-full"/>}
              <Icon size={18} className={!active && item.iconClass ? item.iconClass : undefined}/>
              <span className="text-[9px] leading-none">{item.label.slice(0,6)}</span>
              {item.id === 'voicemail' && vmUnread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{vmUnread}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Avatar */}
      <button onClick={onLogout} title="Logout"
        className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold mt-2 hover:opacity-80 transition">
        {(user?.name || user?.email || 'U')[0].toUpperCase()}
      </button>
    </div>
  );
}
