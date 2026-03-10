import { Phone, Video, Mail, MessageSquare } from "lucide-react";

function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }

export default function RCContactPanel({ contact, onCall, onVideo, onMessage }) {
  if (!contact) return null;
  const STATUS_LABEL = { active: "Active now", away: "Away", offline: "Offline" };
  const STATUS_COLOR = { active: "text-green-400", away: "text-yellow-400", offline: "text-slate-500" };
  const phone = contact.phone || contact.from_number || contact.to_number || "";
  const email = contact.email || ((contact.name||"").toLowerCase().replace(" ",".") + "@company.com");

  return (
    <div className="w-[220px] flex flex-col bg-[#181830] border-l border-white/5 p-4">
      <div className="flex flex-col items-center text-center mb-5 pt-2">
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
            {initials(contact.name || "?")}
          </div>
          <div className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-[#181830] ${
            contact.status === "active" ? "bg-green-400" : contact.status === "away" ? "bg-yellow-400" : "bg-slate-500"
          }`} />
        </div>
        <h3 className="font-semibold text-sm text-white">{contact.name || "Unknown"}</h3>
        <p className={`text-xs mt-0.5 ${STATUS_COLOR[contact.status] || STATUS_COLOR.offline}`}>
          ● {STATUS_LABEL[contact.status] || "Offline"}
        </p>
      </div>

      <div className="flex justify-center gap-3 mb-5">
        {[
          { icon: Phone, label: "Call", action: () => onCall?.(phone, contact.name), color: "hover:bg-green-500/20" },
          { icon: Video, label: "Video", action: () => onVideo?.(contact.name), color: "hover:bg-blue-500/20" },
          { icon: MessageSquare, label: "SMS", action: () => onMessage?.(contact), color: "hover:bg-purple-500/20" },
          { icon: Mail, label: "Email", action: () => {}, color: "hover:bg-yellow-500/20" },
        ].map(({ icon: Icon, label, action, color }) => (
          <button key={label} onClick={action} className="flex flex-col items-center gap-1 group">
            <div className={`w-9 h-9 rounded-xl bg-white/5 ${color} flex items-center justify-center transition-all`}>
              <Icon className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </div>
            <span className="text-[10px] text-slate-600">{label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5">Contact Info</p>
          <div className="space-y-2">
            {phone && (
              <div className="bg-white/4 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-600">Phone</p>
                <p className="text-xs text-slate-300">{phone}</p>
              </div>
            )}
            {contact.extension && (
              <div className="bg-white/4 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-600">Extension</p>
                <p className="text-xs text-slate-300">Ext. {contact.extension}</p>
              </div>
            )}
            <div className="bg-white/4 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-600">Email</p>
              <p className="text-xs text-slate-300 truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
