import { useState, useEffect } from 'react';

const BackIcon = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

function getServerBase() {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:${window.location.port || 4000}`;
  }
  return '';
}

export default function VoicemailSettings({ onBack }) {
  const [ringTimeout, setRingTimeout] = useState(20);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getServerBase();
    const headers = { 'Content-Type': 'application/json' };
    const sessionToken = localStorage.getItem('con_session_token')
      || document.cookie.match(/session=([^;]+)/)?.[1];
    if (sessionToken) headers['x-session'] = sessionToken;

    fetch(`${base}/api/phone/ring-timeout`, { headers, credentials: 'include' })
      .then(r => r.json())
      .then(data => { setRingTimeout(data.ring_timeout || 20); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const saveTimeout = async (val) => {
    setRingTimeout(val);
    setSaved(false);
    const base = getServerBase();
    const headers = { 'Content-Type': 'application/json' };
    const sessionToken = localStorage.getItem('con_session_token')
      || document.cookie.match(/session=([^;]+)/)?.[1];
    if (sessionToken) headers['x-session'] = sessionToken;

    try {
      await fetch(`${base}/api/phone/ring-timeout`, {
        method: 'PATCH', headers, credentials: 'include',
        body: JSON.stringify({ ring_timeout: val }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const presets = [10, 15, 20, 30, 45, 60];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0a0e1a' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', borderBottom: '1px solid #1a2744',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <BackIcon size={22} color="#3b82f6" />
        </button>
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>Voicemail Settings</span>
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b84a8' }}>Loading...</div>
      ) : (
        <div style={{ padding: '20px 16px' }}>
          {/* Ring timeout setting */}
          <div style={{
            background: '#0f1628', borderRadius: '14px', padding: '20px',
            border: '1px solid #1a2744',
          }}>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
              Ring Duration Before Voicemail
            </div>
            <div style={{ color: '#6b84a8', fontSize: '13px', marginBottom: '16px' }}>
              How many seconds to ring before sending the caller to voicemail.
            </div>

            {/* Slider */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={ringTimeout}
                onChange={e => saveTimeout(parseInt(e.target.value))}
                style={{
                  width: '100%', height: '6px', borderRadius: '3px',
                  appearance: 'none', background: '#1a2744', outline: 'none',
                  accentColor: '#3b82f6',
                }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                color: '#6b84a8', fontSize: '11px', marginTop: '4px',
              }}>
                <span>5s</span>
                <span style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 700 }}>
                  {ringTimeout}s
                </span>
                <span>120s</span>
              </div>
            </div>

            {/* Preset buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => saveTimeout(p)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    background: ringTimeout === p ? '#3b82f6' : '#1a2744',
                    color: ringTimeout === p ? '#fff' : '#6b84a8',
                    border: ringTimeout === p ? '1px solid #3b82f6' : '1px solid #253352',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p}s
                </button>
              ))}
            </div>

            {/* Saved indicator */}
            {saved && (
              <div style={{
                marginTop: '12px', color: '#22c55e', fontSize: '13px',
                fontWeight: 600, textAlign: 'center',
              }}>
                Saved
              </div>
            )}
          </div>

          {/* Info box */}
          <div style={{
            marginTop: '16px', padding: '16px', borderRadius: '12px',
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              How it works
            </div>
            <div style={{ color: '#6b84a8', fontSize: '12px', lineHeight: '1.5' }}>
              When someone calls your number and you don't answer within the ring duration,
              the system automatically picks up and plays a voicemail greeting. The caller can
              leave a message which gets transcribed and saved to your voicemail inbox.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
