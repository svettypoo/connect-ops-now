import { APP_LINKS } from './constants';
import { getInitials } from './utils';

// ─── Top Bar ──────────────────────────────────────────────────────────────────
export default function TopBarComp({ search, setSearch, user }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const initials = getInitials(user?.name || user?.email);
  return (
    <div style={{ height:52, minHeight:52, display:'flex', alignItems:'center', padding:'0 20px', gap:16, borderBottom:'1px solid rgba(80,120,200,0.08)', flexShrink:0 }}>
      <div style={{ position:'relative' }}>
        <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', opacity:0.4, pointerEvents:'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8d6e5" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search calls, contacts, messages..." style={{ width:300, padding:'8px 14px 8px 36px', fontSize:'0.82rem', color:'#e2e8f0', background:'rgba(15,22,40,0.5)', border:'1px solid rgba(80,120,200,0.08)', borderRadius:20, outline:'none' }} />
      </div>
      <div style={{ flex:1 }} />
      <div style={{ fontSize:'0.78rem', color:'#c8d6e5', whiteSpace:'nowrap' }}>{dateStr}</div>
      <div style={{ display:'flex', gap:6, marginLeft:12 }}>
        {APP_LINKS.map(app => (
          <a key={app.title} href={app.href} target="_blank" rel="noreferrer" title={app.title} style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, cursor:'pointer', border:'1px solid', borderColor: app.active ? 'rgba(59,130,246,0.2)' : 'rgba(80,120,200,0.08)', background: app.active ? 'rgba(59,130,246,0.15)' : 'rgba(15,22,40,0.4)', color: app.active ? '#93c5fd' : '#c8d6e5', textDecoration:'none', transition:'all 0.15s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path strokeLinecap="round" strokeLinejoin="round" d={app.path} /></svg>
          </a>
        ))}
      </div>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, color:'#fff', marginLeft:8, flexShrink:0 }}>{initials}</div>
    </div>
  );
}
