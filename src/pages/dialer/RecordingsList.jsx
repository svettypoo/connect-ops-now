import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/inboxAiClient';
import RecordingPlayer from './RecordingPlayer';
import TranscriptBlock from './TranscriptBlock';

// RecordingsList — fetches /api/recordings and lists them with playback, search, AI summary + transcript expand
export default function RecordingsList() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    api.getRecordings()
      .then(data => setRecordings(data?.recordings || []))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (rec) => {
    const url = api.streamRecording(rec.id);
    if (playingId === rec.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(url);
      audio.crossOrigin = 'use-credentials';
      audio.onended = () => setPlayingId(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingId(rec.id);
    }
  };

  const deleteRec = async (id, e) => {
    e.stopPropagation();
    await api.deleteRecording(id).catch(() => {});
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
  };

  const fmtDur = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs/60), s = secs%60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  };
  const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1048576) return (bytes/1048576).toFixed(1) + ' MB';
    return Math.round(bytes/1024) + ' KB';
  };
  const fmtTime = (ts) => {
    const d = new Date(ts), now = new Date(), diff = now - d;
    if (diff < 3600000) return Math.round(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff/3600000) + 'h ago';
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };

  const filtered = recordings.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.title||'').toLowerCase().includes(q) || (r.transcript||'').toLowerCase().includes(q) || (r.ai_summary||'').toLowerCase().includes(q);
  });

  if (loading) return <div style={{ padding:'24px', textAlign:'center', color:'#6b84a8', fontSize:'14px' }}>Loading…</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Search bar */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or transcript…"
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'12px', padding:'8px 12px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {filtered.length === 0 && <div style={{ padding:'24px', color:'#6b84a8', textAlign:'center', fontSize:'14px' }}>{recordings.length === 0 ? 'No recordings' : 'No matches'}</div>}

      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.map(rec => {
          const isExpanded = expandedId === rec.id;
          const isPlaying = playingId === rec.id;
          return (
            <div key={rec.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', cursor:'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}>
                <RecordingPlayer
                  recordingId={rec.id}
                  isPlaying={isPlaying}
                  onToggle={() => toggle(rec)}
                  audioRef={audioRef}
                />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:'0 0 2px', fontSize:'13px', color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rec.title || 'Recording'}</p>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ fontSize:'11px', color:'#6b84a8' }}>{fmtTime(rec.created_at)}</span>
                    {rec.duration > 0 && <span style={{ fontSize:'11px', color:'#6b84a8' }}>{fmtDur(rec.duration)}</span>}
                    {rec.size > 0 && <span style={{ fontSize:'11px', color:'#6b84a8' }}>{fmtSize(rec.size)}</span>}
                    {rec.transcript && <span style={{ fontSize:'9px', background:'rgba(6,132,189,0.2)', color:'#60a5fa', padding:'1px 6px', borderRadius:'6px', fontWeight:600 }}>TXT</span>}
                    {rec.ai_summary && <span style={{ fontSize:'9px', background:'rgba(139,92,246,0.2)', color:'#a78bfa', padding:'1px 6px', borderRadius:'6px', fontWeight:600 }}>AI</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  <button onClick={(e) => deleteRec(rec.id, e)}
                    style={{ background:'rgba(244,67,54,0.1)', border:'none', borderRadius:'8px', width:'28px', height:'28px', cursor:'pointer', color:'#f44336', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
                    🗑
                  </button>
                  <span style={{ color:'#243352', fontSize:'12px' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {isExpanded && (rec.ai_summary || rec.transcript) && (
                <div style={{ padding:'0 16px 16px' }}>
                  {rec.ai_summary && (
                    <div style={{ background:'rgba(139,92,246,0.1)', borderRadius:'12px', padding:'12px', marginBottom:'8px' }}>
                      <p style={{ margin:'0 0 6px', fontSize:'10px', color:'#a78bfa', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>AI Summary</p>
                      <p style={{ margin:0, fontSize:'12px', color:'#c4b5fd', lineHeight:1.5, whiteSpace:'pre-line' }}>{rec.ai_summary}</p>
                    </div>
                  )}
                  {rec.transcript && (
                    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px' }}>
                      <p style={{ margin:'0 0 6px', fontSize:'10px', color:'#6b84a8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Transcript</p>
                      <TranscriptBlock text={rec.transcript} maxHeight="160px" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
