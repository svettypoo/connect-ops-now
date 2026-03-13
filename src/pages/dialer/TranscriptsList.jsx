import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import TranscriptBlock from './TranscriptBlock';

// TranscriptsList — shows call logs that have transcripts
export default function TranscriptsList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.getCallLogs().then(data => {
      const all = Array.isArray(data) ? data : (data?.call_logs || []);
      setLogs(all.filter(l => l.transcript && l.transcript.trim().length > 0));
    }).catch(() => setLogs([])).finally(() => setLoading(false));
  }, []);

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #1a2744', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!logs.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#6b84a8', padding: '32px', textAlign: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      <p style={{ margin: 0, fontSize: '14px' }}>No transcripts yet.</p>
      <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>Transcripts are captured from calls using your browser's speech recognition.</p>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {logs.map(log => {
        const isExpanded = expandedId === log.id;
        const name = log.direction === 'inbound' ? (log.from_name || log.from_number) : (log.to_name || log.to_number);
        const number = log.direction === 'inbound' ? log.from_number : log.to_number;
        return (
          <div key={log.id} style={{ borderBottom: '1px solid #1a2744' }}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b84a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', color: '#FFFFFF', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || number || 'Unknown'}</p>
                <p style={{ margin: 0, color: '#6b84a8', fontSize: '12px' }}>{fmtDate(log.started_at)} · {log.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</p>
                {!isExpanded && (
                  <p style={{ margin: '4px 0 0', color: '#4b6a8a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.transcript}</p>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b84a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isExpanded && (
              <div style={{ padding: '0 16px 16px 64px' }}>
                <div style={{ background: '#0f1628', borderRadius: '12px', padding: '12px 14px', border: '1px solid #1a2744' }}>
                  <TranscriptBlock text={log.transcript} maxHeight="300px" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
