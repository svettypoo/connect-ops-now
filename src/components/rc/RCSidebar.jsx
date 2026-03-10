import { MessageSquare, Phone, Video, Users, Settings, Bell, Voicemail, Hash } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { id: "message", icon: MessageSquare, label: "Messages" },
  { id: "dialpad", icon: Hash, label: "Dialpad" },
  { id: "recent", icon: Phone, label: "Recent Calls" },
  { id: "voicemail", icon: Voicemail, label: "Voicemail" },
  { id: "video", icon: Video, label: "Video" },
  { id: "contacts", icon: Users, label: "Contacts" },
];

export default function RCSidebar({ activeNav, setActiveNav, vmUnread }) {
  const { user, logout } = useAuth();
  const initials = (name) => (name||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="w-[60px] flex flex-col items-center py-3 gap-1 bg-[#141428] border-r border-white/5">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B00, #FF8C38)" }}>
        <span className="font-black text-white text-lg">C</span>
      </div>

      {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
        <button key={id} onClick={() => setActiveNav(id)} title={label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group ${
            activeNav === id ? "bg-[#0684BD]/20 text-[#0EB8FF]" : "text-slate-500 hover:text-slate-300 rc-hover"
          }`}>
          {activeNav === id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#0EB8FF]" />}
          <Icon className="w-5 h-5" />
          {id === "voicemail" && vmUnread > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">{vmUnread}</span>
          )}
          <span className="absolute left-14 bg-[#2a2a45] text-xs text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">{label}</span>
        </button>
      ))}

      <div className="flex-1" />
      <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 rc-hover">
        <Bell className="w-5 h-5" />
      </button>
      <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 rc-hover">
        <Settings className="w-5 h-5" />
      </button>
      <button onClick={logout} title="Sign out"
        className="w-8 h-8 rounded-full mt-1 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80">
        {initials(user?.name || user?.email)}
      </button>
    </div>
  );
}
