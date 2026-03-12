import { useState, useRef, useEffect } from "react";
import { usePhone } from "@/lib/usePhone";
import CallNotes from "@/components/dialer/CallNotes";
import api from "@/api/inboxAiClient";

// ── icons ──────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 24, color = "currentColor", fill = "none", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const MicIcon = ({ muted, size = 22 }) => muted ? (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
) : (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const SpeakerIcon = ({ on, size = 22 }) => on ? (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" />
  </svg>
) : (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const KeypadIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="4" height="4" rx="1" /><rect x="10" y="2" width="4" height="4" rx="1" /><rect x="18" y="2" width="4" height="4" rx="1" />
    <rect x="2" y="10" width="4" height="4" rx="1" /><rect x="10" y="10" width="4" height="4" rx="1" /><rect x="18" y="10" width="4" height="4" rx="1" />
    <rect x="2" y="18" width="4" height="4" rx="1" /><rect x="10" y="18" width="4" height="4" rx="1" /><rect x="18" y="18" width="4" height="4" rx="1" />
  </svg>
);

const HoldIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);

const TransferIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h2a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2h2" /><line x1="12" y1="2" x2="12" y2="15" /><polyline points="8 6 12 2 16 6" />
  </svg>
);

const RecordIcon = ({ active, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" />
    {!active && <circle cx="12" cy="12" r="3" fill="currentColor" />}
  </svg>
);

const PhoneOffIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91" /><line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const PhoneAnswerIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const BackspaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
  </svg>
);

const ChevronDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── DTMF freqs ─────────────────────────────────────────────────────────────
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

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Avatar colors consistent with RC palette
const AVATAR_BG = '#2A5F7F';

// ── Timer ──────────────────────────────────────────────────────────────────
function CallTimer({ running }) {
  const [secs, setSecs] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
}

// ── Circular action button ─────────────────────────────────────────────────
function ActionBtn({ icon, label, active, activeColor = '#1A3A4A', activeLabelColor = '#0EB8FF', onClick, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: active ? activeColor : '#1E2025',
          border: active ? `1px solid ${activeLabelColor}40` : '1px solid #2A2D35',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'background 0.15s',
          color: active ? activeLabelColor : '#C8CAD0',
        }}
        onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = '#2A2D35'; }}
        onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.background = '#1E2025'; }}
      >
        {icon}
      </button>
      <span style={{ fontSize: '11px', color: active ? activeLabelColor : '#8B8F9B', textAlign: 'center', lineHeight: 1 }}>{label}</span>
    </div>
  );
}

// ── Transfer dialog (slides up) ───────────────────────────────────────────
function TransferDialog({ onClose, onTransfer }) {
  const [dest, setDest] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const submit = () => { if (dest.trim()) { onTransfer(dest.trim()); onClose(); } };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div
        style={{ width: '100%', background: '#17191C', borderRadius: '20px 20px 0 0', padding: '20px 24px 40px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>Transfer Call</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B8F9B', cursor: 'pointer', padding: '4px' }}>
            <ChevronDown />
          </button>
        </div>
        <input
          ref={inputRef}
          type="tel"
          value={dest}
          onChange={e => setDest(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Number or extension…"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            background: '#1E2025', border: '1px solid #2A2D35',
            color: '#FFFFFF', fontSize: '18px', outline: 'none',
            fontFamily: 'monospace', letterSpacing: '1px', marginBottom: '16px',
          }}
        />
        <button
          onClick={submit}
          disabled={!dest.trim()}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            background: dest.trim() ? '#0684BD' : '#1E2025',
            border: 'none', color: dest.trim() ? '#fff' : '#3A3D45',
            fontSize: '15px', fontWeight: 600, cursor: dest.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          Transfer Now
        </button>
      </div>
    </div>
  );
}

// ── DTMF overlay (slides up) ───────────────────────────────────────────────
function DtmfOverlay({ onClose, onKey }) {
  const [digits, setDigits] = useState('');
  const pressKey = (k) => {
    playDtmf(k);
    setDigits(d => d + k);
    onKey(k);
  };
  const KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', background: '#17191C', borderRadius: '20px 20px 0 0',
          padding: '16px 24px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#2A2D35', margin: '0 auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B8F9B', cursor: 'pointer', padding: '4px' }}>
            <ChevronDown />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '28px', fontWeight: 300, color: '#FFFFFF', letterSpacing: '3px', minHeight: '40px' }}>
            {digits || <span style={{ color: '#3A3D45', fontSize: '14px', fontWeight: 400 }}>Enter digits</span>}
          </div>
          <button
            onClick={() => setDigits(d => d.slice(0, -1))}
            style={{ background: 'none', border: 'none', color: '#8B8F9B', cursor: 'pointer', padding: '4px', opacity: digits ? 1 : 0 }}
          >
            <BackspaceIcon />
          </button>
        </div>

        {/* Keys */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
          {KEYS.map(k => (
            <button
              key={k}
              onClick={() => pressKey(k)}
              style={{
                aspectRatio: '1/1', borderRadius: '50%',
                background: '#1E2025', border: '1px solid #2A2D35',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '1px', cursor: 'pointer', transition: 'background 0.1s', outline: 'none',
              }}
              onMouseDown={e => e.currentTarget.style.background = '#2A2D35'}
              onMouseUp={e => e.currentTarget.style.background = '#1E2025'}
            >
              <span style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 600, lineHeight: 1 }}>{k}</span>
              {DTMF_SUBS[k] && <span style={{ color: '#8B8F9B', fontSize: '9px', letterSpacing: '1.5px' }}>{DTMF_SUBS[k]}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Transcript panel ───────────────────────────────────────────────────────
function TranscriptPanel({ lines, onClose }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div
        style={{ width: '100%', background: '#17191C', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
          <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>Live Transcript</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F44336', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '12px', color: '#F44336' }}>Live</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B8F9B', cursor: 'pointer', marginLeft: '8px', padding: '4px' }}>
              <ChevronDown />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lines.length === 0 && (
            <p style={{ color: '#3A3D45', fontSize: '14px', textAlign: 'center', paddingTop: '24px' }}>Transcript will appear here…</p>
          )}
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: i % 2 === 0 ? '#0684BD' : '#2A2D35',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#fff',
              }}>
                {i % 2 === 0 ? 'Me' : 'C'}
              </div>
              <div style={{ background: '#1E2025', borderRadius: '12px', padding: '8px 12px', flex: 1 }}>
                <p style={{ color: '#C8CAD0', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{line}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function VoiceCall({ dialTo, dialName, onCallEnd }) {
  const phone = usePhone();
  const [showDtmf, setShowDtmf] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [sessionId] = useState(() => 'voice-' + Date.now());
  const [transcript, setTranscript] = useState([]);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const { callControlId } = phone;

  // Auto-call
  const prevDialToRef = useRef(null);
  if (dialTo && dialTo !== prevDialToRef.current && phone.status === 'ready') {
    prevDialToRef.current = dialTo;
    phone.makeCall(dialTo, dialName);
    startTranscription();
  }

  function startTranscription() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (e) => {
      const finals = Array.from(e.results).filter(x => x.isFinal).map(x => x[0].transcript.trim()).filter(Boolean);
      if (finals.length) setTranscript(prev => [...prev, ...finals]);
    };
    r.start();
    recognitionRef.current = r;
  }

  function stopTranscription() { recognitionRef.current?.stop(); recognitionRef.current = null; }

  const handleHangup = () => { stopTranscription(); phone.hangup(); onCallEnd?.(); };

  const toggleSpeaker = async () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      // Route all <audio> elements to speaker (or back to default)
      const audioEls = Array.from(document.querySelectorAll('audio'));
      if (next && audioEls.length && typeof audioEls[0].setSinkId === 'function') {
        // Find a non-default output device (speaker/headset preference)
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const speakers = devices.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
        const sinkId = speakers[0]?.deviceId || '';
        for (const el of audioEls) await el.setSinkId(sinkId).catch(() => {});
      } else {
        for (const el of audioEls) {
          if (typeof el.setSinkId === 'function') await el.setSinkId('default').catch(() => {});
        }
      }
    } catch (_) {}
  };

  const toggleRecording = async () => {
    if (!callControlId) return;
    try {
      if (isRecording) { await api.stopRecording(callControlId); setIsRecording(false); }
      else { await api.startRecording(callControlId); setIsRecording(true); }
    } catch(_) {}
  };

  const sendDtmf = (k) => { phone.sendDtmf(k); };

  const isActive = phone.status === 'active' || phone.status === 'held';
  const isRinging = phone.status === 'ringing';
  const callerName = isRinging ? (phone.inboundCall?.name || 'Incoming Call') : (phone.activeName || dialName || 'Unknown');
  const callerNumber = isRinging ? (phone.inboundCall?.number || '') : (dialTo || phone.activeNumber || '');

  // ── Incoming call screen ─────────────────────────────────────────────────
  if (isRinging) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        height: '100%', background: 'linear-gradient(180deg, #0A1628 0%, #17191C 100%)',
        padding: '60px 24px 48px', fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif",
      }}>
        {/* Top: Incoming label */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#8B8F9B', fontSize: '14px', marginBottom: '24px' }}>Incoming call</p>
          {/* Avatar */}
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%', background: AVATAR_BG,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '34px', fontWeight: 700, color: '#fff', margin: '0 auto 20px',
            boxShadow: '0 0 0 8px rgba(6,132,189,0.15)',
          }}>
            {getInitials(callerName)}
          </div>
          <p style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: 600, margin: '0 0 6px' }}>{callerName}</p>
          {callerNumber && <p style={{ color: '#8B8F9B', fontSize: '15px', margin: 0 }}>{callerNumber}</p>}
        </div>

        {/* Answer / Reject */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '64px', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleHangup}
              style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#F44336', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(244,67,54,0.4)' }}
            >
              <PhoneOffIcon size={30} />
            </button>
            <span style={{ color: '#8B8F9B', fontSize: '13px' }}>Decline</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => { phone.answerCall(); startTranscription(); }}
              style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#4CAF50', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(76,175,80,0.4)' }}
            >
              <PhoneAnswerIcon size={30} />
            </button>
            <span style={{ color: '#8B8F9B', fontSize: '13px' }}>Answer</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Active call screen ───────────────────────────────────────────────────
  if (isActive) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        height: '100%', background: '#17191C',
        padding: '40px 24px 32px',
        fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif",
        position: 'relative',
      }}>
        {/* Overlays */}
        {showDtmf && <DtmfOverlay onClose={() => setShowDtmf(false)} onKey={sendDtmf} />}
        {showTransfer && <TransferDialog onClose={() => setShowTransfer(false)} onTransfer={dest => phone.blindTransfer(dest)} />}
        {showTranscript && <TranscriptPanel lines={transcript} onClose={() => setShowTranscript(false)} />}

        {/* Status + timer */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ color: phone.status === 'held' ? '#FF9800' : '#4CAF50', fontSize: '13px', fontWeight: 500, margin: '0 0 4px' }}>
            {phone.status === 'held' ? 'On Hold' : 'On Call'}
          </p>
          <p style={{ color: '#8B8F9B', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
            <CallTimer running={phone.status === 'active'} />
          </p>
        </div>

        {/* Avatar */}
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%', background: AVATAR_BG,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px', fontWeight: 700, color: '#fff', margin: '16px auto 16px',
          boxShadow: phone.status === 'active' ? '0 0 0 4px rgba(76,175,80,0.25), 0 0 0 8px rgba(76,175,80,0.08)' : 'none',
          transition: 'box-shadow 0.5s',
        }}>
          {getInitials(callerName)}
        </div>

        {/* Name + number */}
        <p style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 600, margin: '0 0 4px', textAlign: 'center' }}>{callerName}</p>
        {callerNumber && <p style={{ color: '#8B8F9B', fontSize: '14px', margin: '0 0 32px', textAlign: 'center' }}>{callerNumber}</p>}

        {/* Audio waveform animation */}
        {phone.status === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px', marginBottom: '32px' }}>
            {[4,7,10,7,12,9,6,11,8,5,10,7,4].map((h, i) => (
              <div key={i} style={{
                width: '3px', borderRadius: '2px', background: '#4CAF50',
                animation: `wave ${0.6 + i * 0.07}s ease-in-out infinite alternate`,
                height: h + 'px',
              }} />
            ))}
          </div>
        )}

        {/* 6-button grid: Mute / Keypad / Speaker — Hold / Transfer / Record */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 24px', width: '100%', maxWidth: '300px', marginBottom: '40px' }}>
          <ActionBtn
            icon={<MicIcon muted={phone.isMuted} size={22} />}
            label={phone.isMuted ? 'Unmute' : 'Mute'}
            active={phone.isMuted}
            activeColor="#2A1515"
            activeLabelColor="#F44336"
            onClick={phone.toggleMute}
          />
          <ActionBtn
            icon={<KeypadIcon size={22} />}
            label="Keypad"
            active={showDtmf}
            onClick={() => setShowDtmf(p => !p)}
          />
          <ActionBtn
            icon={<SpeakerIcon on={speakerOn} size={22} />}
            label="Speaker"
            active={speakerOn}
            onClick={toggleSpeaker}
          />
          <ActionBtn
            icon={<HoldIcon size={22} />}
            label={phone.isOnHold ? 'Resume' : 'Hold'}
            active={phone.isOnHold}
            activeColor="#2A2000"
            activeLabelColor="#FF9800"
            onClick={phone.toggleHold}
          />
          <ActionBtn
            icon={<TransferIcon size={22} />}
            label="Transfer"
            active={showTransfer}
            onClick={() => setShowTransfer(p => !p)}
          />
          <ActionBtn
            icon={<RecordIcon active={isRecording} size={22} />}
            label={isRecording ? 'Stop Rec' : 'Record'}
            active={isRecording}
            activeColor="#2A1515"
            activeLabelColor="#F44336"
            onClick={toggleRecording}
          />
        </div>

        {/* Transcript button */}
        <button
          onClick={() => setShowTranscript(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '20px',
            background: showTranscript ? 'rgba(6,132,189,0.2)' : 'rgba(255,255,255,0.05)',
            border: showTranscript ? '1px solid rgba(6,132,189,0.4)' : '1px solid rgba(255,255,255,0.08)',
            color: showTranscript ? '#0EB8FF' : '#8B8F9B', fontSize: '13px', cursor: 'pointer',
            marginBottom: '32px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {showTranscript ? 'Hide transcript' : 'Live transcript'}
          {transcript.length > 0 && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F44336', display: 'inline-block' }} />
          )}
        </button>

        {/* End call button */}
        <button
          onClick={handleHangup}
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: '#F44336', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 24px rgba(244,67,54,0.5)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <PhoneOffIcon size={28} />
        </button>

        <style>{`
          @keyframes wave {
            from { transform: scaleY(0.4); opacity: 0.6; }
            to { transform: scaleY(1.2); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  // ── Post-call / idle ─────────────────────────────────────────────────────
  if (phone.elapsed > 0) {
    return (
      <div style={{ padding: '16px', background: '#17191C', height: '100%' }}>
        <CallNotes sessionId={sessionId} callType="voice" durationMinutes={Math.round(phone.elapsed / 60)} transcript={transcript} />
      </div>
    );
  }

  // ── Mic permission denied ────────────────────────────────────────────────
  if (phone.micDenied) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#17191C', gap: '12px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px' }}>🎤</div>
        <p style={{ color: '#FF5252', fontSize: '15px', fontWeight: 600 }}>Microphone Access Required</p>
        <p style={{ color: '#8B8F9B', fontSize: '13px', maxWidth: '260px' }}>
          Go to Settings → Apps → Connect Ops → Permissions and enable Microphone, then restart the app.
        </p>
      </div>
    );
  }

  // ── Ready / connecting ───────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#17191C', gap: '12px',
      fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif",
    }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #2A2D35', borderTopColor: '#0EB8FF', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#8B8F9B', fontSize: '14px' }}>
        {phone.status === 'reconnecting' ? 'Reconnecting…' : phone.status === 'connecting' ? 'Connecting…' : 'Initializing phone…'}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: '8px', background: 'none', border: '1px solid #2A2D35', borderRadius: '8px', color: '#8B8F9B', padding: '6px 18px', fontSize: '13px', cursor: 'pointer' }}
      >
        Retry
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
