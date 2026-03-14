import { useState, useRef, useEffect, useCallback } from 'react';

// ── Icons (compact versions) ────────────────────────────────────────────────
const MicIcon = ({ muted, size = 18 }) => muted ? (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
) : (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const HoldIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PhoneOffIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91" /><line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const ExpandIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const CollapseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const KeypadIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="4" height="4" rx="1" /><rect x="10" y="2" width="4" height="4" rx="1" /><rect x="18" y="2" width="4" height="4" rx="1" />
    <rect x="2" y="10" width="4" height="4" rx="1" /><rect x="10" y="10" width="4" height="4" rx="1" /><rect x="18" y="10" width="4" height="4" rx="1" />
    <rect x="2" y="18" width="4" height="4" rx="1" /><rect x="10" y="18" width="4" height="4" rx="1" /><rect x="18" y="18" width="4" height="4" rx="1" />
  </svg>
);

const RecordIcon = ({ active, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    {!active && <circle cx="12" cy="12" r="3" fill="currentColor" />}
  </svg>
);

// ── DTMF ─────────────────────────────────────────────────────────────────────
const DTMF_FREQS = {
  '1':[697,1209],'2':[697,1336],'3':[697,1477],
  '4':[770,1209],'5':[770,1336],'6':[770,1477],
  '7':[852,1209],'8':[852,1336],'9':[852,1477],
  '*':[941,1209],'0':[941,1336],'#':[941,1477],
};
const DTMF_SUBS = {'2':'ABC','3':'DEF','4':'GHI','5':'JKL','6':'MNO','7':'PQRS','8':'TUV','9':'WXYZ','0':'+'};

function playDtmf(key) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const [f1, f2] = DTMF_FREQS[key] || [];
    if (!f1) return;
    [f1, f2].forEach(freq => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    });
    setTimeout(() => ctx.close(), 400);
  } catch(_) {}
}

// ── Timer ────────────────────────────────────────────────────────────────────
function CallTimer({ running }) {
  const [secs, setSecs] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      clearInterval(ref.current);
      setSecs(0);
    }
    return () => clearInterval(ref.current);
  }, [running]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
}

// ── Mini control button ──────────────────────────────────────────────────────
function MiniBtn({ icon, label, active, activeColor = '#1A3A4A', activeLabelColor = '#60a5fa', onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: danger ? '#dc2626' : active ? activeColor : '#0f1628',
        border: danger ? '1px solid #ef444440' : active ? `1px solid ${activeLabelColor}40` : '1px solid #1a2744',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: danger ? '#fff' : active ? activeLabelColor : '#c8d6e5',
        transition: 'background 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {icon}
    </button>
  );
}


// ── Main Component ───────────────────────────────────────────────────────────
export default function FloatingCallWidget({ phone, onExpand }) {
  const [expanded, setExpanded] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: window.innerHeight - 200 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  // Drag handling
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('[data-no-drag]')) return;
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.current.y));
      setPos({ x: newX, y: newY });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Touch drag
  const onTouchStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('[data-no-drag]')) return;
    const touch = e.touches[0];
    dragging.current = true;
    dragOffset.current = {
      x: touch.clientX - pos.x,
      y: touch.clientY - pos.y,
    };
  }, [pos]);

  useEffect(() => {
    const onTouchMove = (e) => {
      if (!dragging.current) return;
      const touch = e.touches[0];
      const newX = Math.max(0, Math.min(window.innerWidth - 320, touch.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, touch.clientY - dragOffset.current.y));
      setPos({ x: newX, y: newY });
    };
    const onTouchEnd = () => { dragging.current = false; };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const isActive = phone.status === 'active' || phone.status === 'held';
  const isCalling = phone.status === 'calling';
  const callName = phone.activeName || phone.activeNumber || 'Unknown';
  const callNumber = phone.activeNumber || '';
  const initials = callName ? callName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  // Collapsed: compact pill
  if (!expanded) {
    return (
      <div
        ref={widgetRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #0f1629, #162038)',
          border: '1px solid #1e3a5f',
          borderRadius: 20,
          padding: '8px 12px 8px 8px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'grab',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.15)',
          userSelect: 'none',
          minWidth: 200,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Pulsing avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: phone.status === 'held' ? '#92400e' : '#1e6f3e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
          animation: isActive ? 'pulse-call 2s infinite' : 'none',
        }}>
          {initials}
        </div>
        {/* Name + timer */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {callName}
          </div>
          <div style={{ fontSize: 11, color: phone.status === 'held' ? '#fbbf24' : '#4ade80', fontWeight: 500 }}>
            {phone.status === 'held' ? 'On Hold' : isCalling ? 'Calling...' : <CallTimer running={isActive} />}
          </div>
        </div>
        {/* Quick controls */}
        <div style={{ display: 'flex', gap: 6 }}>
          <MiniBtn
            icon={<MicIcon muted={phone.isMuted} size={16} />}
            label={phone.isMuted ? 'Unmute' : 'Mute'}
            active={phone.isMuted}
            activeColor="#3b1818"
            activeLabelColor="#f87171"
            onClick={() => phone.toggleMute()}
          />
          <MiniBtn
            icon={<PhoneOffIcon size={16} />}
            label="Hang Up"
            danger
            onClick={() => phone.hangup()}
          />
        </div>
        {/* Expand button */}
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'none', border: 'none', color: '#6b84a8', cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center',
          }}
          title="Expand"
        >
          <ExpandIcon size={14} />
        </button>
      </div>
    );
  }

  // Expanded: full controls panel
  return (
    <div
      ref={widgetRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        zIndex: 9999,
        width: 300,
        background: 'linear-gradient(145deg, #0c1220, #111b2e)',
        border: '1px solid #1e3a5f',
        borderRadius: 16,
        boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
        cursor: 'grab',
        userSelect: 'none',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}
    >
      {/* Header bar — draggable */}
      <div style={{
        padding: '10px 12px',
        background: 'rgba(15,22,40,0.8)',
        borderBottom: '1px solid #1a2744',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: phone.status === 'held' ? '#92400e' : '#1e6f3e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          animation: isActive ? 'pulse-call 2s infinite' : 'none',
        }}>
          {initials}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {callName}
          </div>
          <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: phone.status === 'held' ? '#fbbf24' : '#4ade80', fontWeight: 500 }}>
              {phone.status === 'held' ? 'On Hold' : isCalling ? 'Calling...' : <CallTimer running={isActive} />}
            </span>
            {callNumber && callNumber !== callName && (
              <span style={{ color: '#6b84a8', fontSize: 11 }}>{callNumber}</span>
            )}
          </div>
        </div>
        {/* Collapse + Go To Call */}
        <div style={{ display: 'flex', gap: 4 }}>
          {onExpand && (
            <button
              onClick={onExpand}
              title="Go to call"
              style={{
                background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <ExpandIcon size={14} />
            </button>
          )}
          <button
            onClick={() => setExpanded(false)}
            title="Collapse"
            style={{
              background: 'none', border: 'none', color: '#6b84a8', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <CollapseIcon size={14} />
          </button>
        </div>
      </div>

      {/* Controls grid */}
      <div style={{ padding: '14px 16px' }}>
        {!showKeypad ? (
          <>
            {/* 2 rows of 3 controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, justifyItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MiniBtn
                  icon={<MicIcon muted={phone.isMuted} size={18} />}
                  label="Mute"
                  active={phone.isMuted}
                  activeColor="#3b1818"
                  activeLabelColor="#f87171"
                  onClick={() => phone.toggleMute()}
                />
                <span style={{ fontSize: 10, color: phone.isMuted ? '#f87171' : '#6b84a8' }}>Mute</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MiniBtn
                  icon={<KeypadIcon size={18} />}
                  label="Keypad"
                  onClick={() => setShowKeypad(true)}
                />
                <span style={{ fontSize: 10, color: '#6b84a8' }}>Keypad</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MiniBtn
                  icon={<HoldIcon size={18} />}
                  label="Hold"
                  active={phone.isOnHold}
                  activeColor="#422006"
                  activeLabelColor="#fbbf24"
                  onClick={() => phone.toggleHold()}
                />
                <span style={{ fontSize: 10, color: phone.isOnHold ? '#fbbf24' : '#6b84a8' }}>Hold</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, justifyItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MiniBtn
                  icon={<RecordIcon active={phone.isRecording} size={18} />}
                  label="Record"
                  active={phone.isRecording}
                  activeColor="#3b1818"
                  activeLabelColor="#f87171"
                  onClick={() => phone.toggleRecording()}
                />
                <span style={{ fontSize: 10, color: phone.isRecording ? '#f87171' : '#6b84a8' }}>Record</span>
              </div>
              {/* Spacer */}
              <div />
              <div />
            </div>
          </>
        ) : (
          /* DTMF Keypad */
          <div data-no-drag style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#6b84a8', fontWeight: 600 }}>Keypad</span>
              <button onClick={() => setShowKeypad(false)} style={{ background: 'none', border: 'none', color: '#6b84a8', cursor: 'pointer', fontSize: 12 }}>
                Done
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => (
                <button
                  key={k}
                  onClick={() => { playDtmf(k); phone.sendDtmf(k); }}
                  style={{
                    height: 44, borderRadius: 10,
                    background: '#0f1628', border: '1px solid #1a2744',
                    color: '#e2e8f0', fontSize: 18, fontWeight: 500,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a2744'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0f1628'; }}
                >
                  {k}
                  {DTMF_SUBS[k] && <span style={{ fontSize: 8, color: '#6b84a8', letterSpacing: 2, marginTop: -2 }}>{DTMF_SUBS[k]}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hang up */}
        <button
          onClick={() => phone.hangup()}
          style={{
            width: '100%', height: 44, borderRadius: 22,
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <PhoneOffIcon size={18} />
          End Call
        </button>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes pulse-call {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
        }
      `}</style>
    </div>
  );
}
