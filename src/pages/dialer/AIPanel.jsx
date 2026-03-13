import { useState } from 'react';
import { api } from '@/api/inboxAiClient';

// ─── AI Panel ─────────────────────────────────────────────────────────────────
export default function AIPanel({ summary, tasks, phone }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role:'user', text: msg }]);
    setLoading(true);
    try {
      const context = summary ? 'Last call summary: ' + summary : '';
      const data = await api.askAI(context ? context + '\n\nUser: ' + msg : msg);
      setMessages(prev => [...prev, { role:'ai', text: data.response || 'No response' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:'ai', text: 'Error: ' + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: 'Draft follow-up email', icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75' },
    { label: 'Suggest response to missed call', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' },
    { label: 'Summarize recent calls', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75' },
  ];

  return (
    <div style={{ width:280, minWidth:280, borderLeft:'1px solid rgba(80,120,200,0.08)', display:'flex', flexDirection:'column', overflowY:'auto', padding:'20px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa', display:'inline-block', animation:'pulse-ai 2s infinite', boxShadow:'0 0 0 0 rgba(167,139,250,0.4)' }}></span>
        <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0' }}>AI Assistant</span>
      </div>
      {summary && (
        <div style={{ padding:14, borderRadius:12, background:'rgba(12,18,35,0.6)', border:'1px solid rgba(80,120,200,0.08)', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"/></svg>
            <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0' }}>Call Summary</span>
          </div>
          <p style={{ fontSize:'0.78rem', color:'#c8d6e5', lineHeight:1.7, margin:0 }}>{summary}</p>
        </div>
      )}
      {tasks.length > 0 && (
        <div style={{ padding:14, borderRadius:12, background:'rgba(12,18,35,0.6)', border:'1px solid rgba(80,120,200,0.08)', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"/></svg>
            <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#e2e8f0' }}>Suggested Tasks</span>
          </div>
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {tasks.map((t, i) => <li key={i} style={{ fontSize:'0.78rem', color:'#c8d6e5', padding:'4px 0', display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:'0.7rem', color:'rgba(100,140,180,0.45)' }}>☐</span>{t}</li>)}
          </ul>
        </div>
      )}
      <div style={{ marginTop:12 }}>
        {suggestions.map(s => (
          <button key={s.label} onClick={() => setInput(s.label)} style={{ display:'block', width:'100%', padding:'9px 12px', marginBottom:8, fontSize:'0.75rem', color:'#c4b5fd', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.1)', borderRadius:8, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display:'inline', verticalAlign:'middle', marginRight:6 }}><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
            {s.label}
          </button>
        ))}
      </div>
      {messages.length > 0 && (
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius:10, background: m.role === 'user' ? 'rgba(59,130,246,0.12)' : 'rgba(167,139,250,0.08)', fontSize:'0.78rem', color: m.role === 'user' ? '#93c5fd' : '#c8d6e5', lineHeight:1.6 }}>{m.text}</div>
          ))}
          {loading && <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(167,139,250,0.08)', fontSize:'0.78rem', color:'rgba(167,139,250,0.6)' }}>Thinking…</div>}
        </div>
      )}
      <div style={{ marginTop:'auto', display:'flex', gap:8, paddingTop:12 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask AI anything..." style={{ flex:1, padding:'9px 12px', fontSize:'0.78rem', color:'#e2e8f0', background:'rgba(15,22,40,0.5)', border:'1px solid rgba(80,120,200,0.1)', borderRadius:8, outline:'none' }} />
        <button onClick={send} disabled={loading} style={{ width:36, height:36, borderRadius:8, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#a78bfa,#7c3aed)', color:'#fff', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>
        </button>
      </div>
    </div>
  );
}
