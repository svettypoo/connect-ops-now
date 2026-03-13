import { NAV_SECTIONS } from './constants';
import { getInitials } from './utils';

function NavIcon({ path }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {path.includes('M') && path.split(' M').map((p, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i === 0 ? p : 'M' + p} />
      ))}
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function SidebarComp({ activeNav, setActiveNav, user, onLogout, vmUnread, msgUnread, onNewCall }) {
  const initials = getInitials(user?.name || user?.email);
  return (
    <aside style={{ width:240, minWidth:240, height:'100%', background:'rgba(8,12,24,0.97)', borderRight:'1px solid rgba(80,120,200,0.08)', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* Brand */}
      <div style={{ padding:'22px 20px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#b8860b,#daa520,#f0c040)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.58rem', color:'#1a0e00', letterSpacing:'0.8px', flexShrink:0, boxShadow:'0 2px 12px rgba(218,165,32,0.2)' }}>S&T</div>
          <div>
            <div style={{ fontSize:'0.78rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'rgba(200,214,229,0.75)', fontWeight:600 }}>S&T Properties</div>
            <div style={{ fontSize:'0.55rem', letterSpacing:'4px', textTransform:'uppercase', color:'rgba(100,150,220,0.45)', marginTop:1 }}>Phone System</div>
          </div>
        </div>
      </div>
      {/* New Call button */}
      <button onClick={onNewCall} style={{ margin:'0 16px 12px', padding:'10px', fontSize:'0.82rem', fontWeight:600, color:'#fff', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>
        New Call
      </button>
      {/* Nav */}
      <nav style={{ flex:1, padding:'0 8px' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div style={{ fontSize:'0.6rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(100,140,180,0.35)', padding:'14px 12px 6px' }}>{section.label}</div>
            {section.items.map(item => {
              const isActive = activeNav === item.id;
              const badge = item.badge === 'vm' ? vmUnread : item.badge === 'msg' ? msgUnread : 0;
              return (
                <div key={item.id} onClick={() => setActiveNav(item.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', fontSize:'0.82rem', color: isActive ? '#93c5fd' : '#c8d6e5', borderRadius:8, cursor:'pointer', border:'1px solid', borderColor: isActive ? 'rgba(59,130,246,0.1)' : 'transparent', background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent', transition:'all 0.15s' }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='rgba(59,130,246,0.05)'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='transparent'; } }}
                >
                  <span style={{ width:18, height:18, flexShrink:0, opacity: isActive ? 1 : 0.6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
                    </svg>
                  </span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {badge > 0 && <span style={{ fontSize:'0.68rem', padding:'1px 7px', borderRadius:10, background: item.badgeRed ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: item.badgeRed ? '#f87171' : '#60a5fa', fontWeight:600 }}>{badge}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      {/* User */}
      <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(80,120,200,0.08)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'#fff', flexShrink:0, position:'relative' }}>
          {initials}
          <span style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:'#10b981', border:'2px solid rgba(8,12,24,0.9)' }}></span>
        </div>
        <div style={{ overflow:'hidden', flex:1 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name || user?.email}</div>
          <div style={{ fontSize:'0.65rem', color:'rgba(100,140,180,0.45)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
        </div>
        <button onClick={onLogout} title="Sign out" style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(100,140,180,0.45)', padding:4, display:'flex', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );
}
