import { useState } from 'react';
import { getInitials, avatarColor, fmtLogTime } from './utils';

// ─── List Panel ───────────────────────────────────────────────────────────────
export default function ListPanelComp({ activeNav, callLogs, contacts, selectedId, onSelect }) {
  const [filter, setFilter] = useState('recent');
  const pills = ['Recent', 'Missed', 'Contacts'];

  const logItems = filter === 'contacts' ? [] : callLogs.filter(l => filter !== 'missed' || l.call_type === 'missed' || l.duration === 0);
  const contactItems = filter === 'contacts' ? contacts : [];

  return (
    <div style={{ width:360, minWidth:360, borderRight:'1px solid rgba(80,120,200,0.08)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(80,120,200,0.06)', flexShrink:0 }}>
        {pills.map(p => {
          const isActive = filter === p.toLowerCase();
          return (
            <button key={p} onClick={() => setFilter(p.toLowerCase())} style={{ padding:'5px 14px', fontSize:'0.75rem', borderRadius:16, cursor:'pointer', background: isActive ? 'rgba(59,130,246,0.12)' : 'rgba(15,22,40,0.4)', color: isActive ? '#93c5fd' : '#c8d6e5', border:'1px solid', borderColor: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(80,120,200,0.08)', transition:'all 0.15s' }}>{p}</button>
          );
        })}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {filter === 'contacts' ? contactItems.map(c => {
          const ini = getInitials(c.name || c.phone);
          const isActive = selectedId === 'c_' + c.id;
          return (
            <div key={c.id} onClick={() => onSelect({ type:'contact', data:c, id:'c_'+c.id })}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderLeft:'2px solid', borderLeftColor: isActive ? '#3b82f6' : 'transparent', background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent', transition:'all 0.15s' }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:avatarColor(c.name||c.phone), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#fff', flexShrink:0 }}>{ini}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>{c.name || c.phone}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.phone}</div>
              </div>
            </div>
          );
        }) : logItems.map(l => {
          const name = l.from_name || l.to_name || (l.direction === 'inbound' ? l.from_number : l.to_number) || 'Unknown';
          const num = l.direction === 'inbound' ? l.from_number : l.to_number;
          const isMissed = l.call_type === 'missed' || (!l.duration && l.direction === 'inbound');
          const isOut = l.direction === 'outbound';
          const ini = getInitials(name);
          const isActive = selectedId === 'l_' + l.id;
          return (
            <div key={l.id} onClick={() => onSelect({ type:'log', data:l, id:'l_'+l.id })}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderLeft:'2px solid', borderLeftColor: isActive ? '#3b82f6' : 'transparent', background: isActive ? 'rgba(59,130,246,0.06)' : 'transparent', transition:'all 0.15s' }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:avatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#fff', flexShrink:0 }}>{ini}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>{name}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{num}{l.duration > 0 ? ' · ' + Math.floor(l.duration/60) + ':' + String(l.duration%60).padStart(2,'0') : isMissed ? ' · missed' : ''}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:'0.68rem', color:'rgba(100,140,180,0.45)' }}>{fmtLogTime(l.started_at || l.created_at)}</div>
                <div style={{ marginTop:4, fontSize:'0.85rem', color: isMissed ? '#ef4444' : isOut ? '#3b82f6' : '#10b981' }}>
                  {isMissed ? '✕' : isOut ? '↗' : '↙'}
                </div>
              </div>
            </div>
          );
        })}
        {logItems.length === 0 && contactItems.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:'rgba(100,140,180,0.45)', fontSize:'0.82rem' }}>No items</div>
        )}
      </div>
    </div>
  );
}
