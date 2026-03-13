import { getInitials, avatarColor } from './utils';

// ─── Contact Detail (shown in detail panel when a list item is selected) ──────
export default function ContactDetailView({ item, onCall, onMessage, onVideo }) {
  const { type, data } = item;
  const isLog = type === 'log';
  const name = isLog ? (data.from_name || data.to_name || (data.direction === 'inbound' ? data.from_number : data.to_number) || 'Unknown') : (data.name || data.phone);
  const phone = isLog ? (data.direction === 'inbound' ? data.from_number : data.to_number) : data.phone;
  const role = isLog ? (data.direction === 'inbound' ? 'Incoming call' : 'Outgoing call') : (data.company || '');
  const ini = getInitials(name);
  const aColor = avatarColor(name);

  const actionBtn = (label, bg, color, border, onClick) => (
    <button onClick={onClick} title={label} style={{ width:44, height:44, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border, cursor:'pointer', background:bg, color, transition:'all 0.2s' }}>
      {label === 'Call' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>}
      {label === 'Video' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>}
      {label === 'SMS' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/></svg>}
      {label === 'Email' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>}
    </button>
  );

  return (
    <div style={{ padding:'28px 32px', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:aColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', fontWeight:700, color:'#fff', boxShadow:'0 4px 24px rgba(59,130,246,0.25)' }}>{ini}</div>
        <div>
          <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#e2e8f0' }}>{name}</div>
          <div style={{ fontSize:'0.82rem', color:'#c8d6e5', marginTop:2 }}>{role}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:28 }}>
        {actionBtn('Call', 'linear-gradient(135deg,#10b981,#059669)', '#fff', 'none', () => onCall(phone, name))}
        {actionBtn('Video', 'rgba(59,130,246,0.15)', '#60a5fa', '1px solid rgba(59,130,246,0.15)', onVideo)}
        {actionBtn('SMS', 'rgba(167,139,250,0.12)', '#a78bfa', '1px solid rgba(167,139,250,0.12)', () => onMessage(phone))}
        {actionBtn('Email', 'rgba(251,191,36,0.12)', '#fbbf24', '1px solid rgba(251,191,36,0.12)', () => data.email && window.open('mailto:' + data.email))}
      </div>
      <div style={{ fontSize:'0.65rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(100,140,180,0.35)', marginBottom:12 }}>Contact Information</div>
      <div style={{ marginBottom:28 }}>
        {phone && <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(80,120,200,0.06)' }}>
          <span style={{ color:'rgba(100,140,180,0.45)', width:22, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg></span>
          <span style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', width:60 }}>Phone</span>
          <span style={{ fontSize:'0.82rem', color:'#e2e8f0' }}>{phone}</span>
        </div>}
        {data.email && <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(80,120,200,0.06)' }}>
          <span style={{ color:'rgba(100,140,180,0.45)', width:22, display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg></span>
          <span style={{ fontSize:'0.72rem', color:'rgba(100,140,180,0.45)', width:60 }}>Email</span>
          <span style={{ fontSize:'0.82rem', color:'#e2e8f0' }}>{data.email}</span>
        </div>}
      </div>
      {isLog && data.transcript && (
        <>
          <div style={{ fontSize:'0.65rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(100,140,180,0.35)', marginBottom:12 }}>Transcript</div>
          <div style={{ padding:14, borderRadius:12, background:'rgba(12,18,35,0.6)', border:'1px solid rgba(80,120,200,0.08)', fontSize:'0.78rem', color:'#c8d6e5', lineHeight:1.7 }}>{data.transcript}</div>
        </>
      )}
    </div>
  );
}
