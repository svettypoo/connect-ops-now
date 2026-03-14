import { useState, useRef, useEffect, useCallback } from 'react';

const PhoneAnswerIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const PhoneOffIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91" /><line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

export default function FloatingIncomingCall({ inbound, onAnswer, onDecline, stackOffset = 0 }) {
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  // Center horizontally on first render
  useEffect(() => {
    if (!initialized.current) {
      setPos({
        x: Math.max(20, Math.floor((window.innerWidth - 340) / 2)),
        y: 20 + stackOffset,
      });
      initialized.current = true;
    }
  }, [stackOffset]);

  // Drag handling
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 340, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 120, e.clientY - dragOffset.current.y)),
      });
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
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    dragging.current = true;
    dragOffset.current = { x: touch.clientX - pos.x, y: touch.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onTouchMove = (e) => {
      if (!dragging.current) return;
      const touch = e.touches[0];
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 340, touch.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 120, touch.clientY - dragOffset.current.y)),
      });
    };
    const onTouchEnd = () => { dragging.current = false; };
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  if (!inbound) return null;
  if (pos.x < 0) return null; // not positioned yet

  const callerName = inbound.name || inbound.number || 'Unknown';
  const callerNumber = inbound.number || '';
  const initials = callerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <>
      <style>{`
        @keyframes incoming-vibrate {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-3px) rotate(-1deg); }
          20% { transform: translateX(3px) rotate(1deg); }
          30% { transform: translateX(-3px) rotate(-1deg); }
          40% { transform: translateX(3px) rotate(1deg); }
          50% { transform: translateX(-2px); }
          60% { transform: translateX(0); }
        }
        @keyframes incoming-glow {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(74,222,128,0.3), 0 0 20px rgba(74,222,128,0.1); }
          50% { box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 4px rgba(74,222,128,0.5), 0 0 40px rgba(74,222,128,0.25); }
        }
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes avatar-ring {
          0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
      `}</style>
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          zIndex: 10000,
          width: 320,
          background: 'linear-gradient(145deg, #0c1a12, #0f2318)',
          border: '2px solid #22c55e',
          borderRadius: 20,
          padding: '16px',
          cursor: 'grab',
          userSelect: 'none',
          backdropFilter: 'blur(24px)',
          animation: 'incoming-vibrate 0.6s ease-in-out infinite, incoming-glow 2s ease-in-out infinite',
        }}
      >
        {/* Header label */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
            animation: 'ring-pulse 1s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Incoming Call
          </span>
        </div>

        {/* Caller info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {/* Avatar with ring animation */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #166534, #22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
            animation: 'avatar-ring 1.5s ease-out infinite',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: '#ffffff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {callerName}
            </div>
            {callerNumber && callerNumber !== callerName && (
              <div style={{ fontSize: 13, color: '#86efac', marginTop: 2 }}>
                {callerNumber}
              </div>
            )}
          </div>
        </div>

        {/* Answer / Decline buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1, height: 48, borderRadius: 24,
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'transform 0.1s, filter 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            <PhoneOffIcon size={18} />
            Decline
          </button>
          <button
            onClick={onAnswer}
            style={{
              flex: 1, height: 48, borderRadius: 24,
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'transform 0.1s, filter 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            <PhoneAnswerIcon size={18} />
            Answer
          </button>
        </div>
      </div>
    </>
  );
}
