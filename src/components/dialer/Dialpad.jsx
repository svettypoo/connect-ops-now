import { useState, useEffect } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import api from "@/api/inboxAiClient";

const KEYS = [
  { key: "1", sub: "" }, { key: "2", sub: "ABC" }, { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" }, { key: "5", sub: "JKL" }, { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" }, { key: "8", sub: "TUV" }, { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" }, { key: "0", sub: "+" }, { key: "#", sub: "" },
];

const DTMF_FREQS = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

function playDtmf(key) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const [f1, f2] = DTMF_FREQS[key] || [];
    if (!f1) return;
    [f1, f2].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    });
    setTimeout(() => ctx.close(), 300);
  } catch (e) {}
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts), diff = Date.now() - d;
  if (diff < 3600000) return Math.round(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.round(diff / 3600000) + "h ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const BackspaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
);

const PhoneCallIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

export default function Dialpad({ onCall, phoneStatus, phoneNumber }) {
  const [number, setNumber] = useState("");
  const [recents, setRecents] = useState([]);
  const [matchedContact, setMatchedContact] = useState(null);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    api.getCallLogs().then(logs => {
      if (Array.isArray(logs)) {
        const seen = new Set();
        const unique = [];
        for (const l of logs) {
          const num = l.direction === "inbound" ? l.from_number : l.to_number;
          if (num && !seen.has(num)) { seen.add(num); unique.push(l); }
          if (unique.length >= 5) break;
        }
        setRecents(unique);
      }
    }).catch(() => {});
    api.getContacts().then(cs => { if (Array.isArray(cs)) setContacts(cs); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (number.length >= 7) {
      const match = contacts.find(c => c.phone && c.phone.replace(/\D/g, "").includes(number.replace(/\D/g, "")));
      setMatchedContact(match || null);
    } else {
      setMatchedContact(null);
    }
  }, [number, contacts]);

  const pressKey = (k) => { playDtmf(k); setNumber(n => n + k); };
  const backspace = () => setNumber(n => n.slice(0, -1));
  const handleCall = () => { if (number.trim()) onCall?.(number.trim(), matchedContact?.name || ""); };

  const busy = phoneStatus === "active" || phoneStatus === "held" || phoneStatus === "ringing";

  const StatusIcon = ({ direction, status }) => {
    if (status === "missed") return <PhoneMissed size={14} color="#F44336" />;
    if (direction === "inbound") return <PhoneIncoming size={14} color="#4CAF50" />;
    return <PhoneOutgoing size={14} color="#8B8F9B" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', maxWidth: '360px', margin: '0 auto', fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif" }}>

      {/* Caller ID match */}
      {matchedContact && (
        <div style={{ width: '100%', background: 'rgba(6,132,189,0.1)', border: '1px solid rgba(6,132,189,0.25)', borderRadius: '10px', padding: '8px 16px', textAlign: 'center', marginBottom: '12px' }}>
          <p style={{ color: '#0684BD', fontWeight: 600, fontSize: '14px', margin: 0 }}>{matchedContact.name}</p>
          <p style={{ color: '#8B8F9B', fontSize: '11px', margin: 0 }}>{matchedContact.company || "Contact"}</p>
        </div>
      )}
      {!matchedContact && number.length >= 7 && (
        <div style={{ width: '100%', background: '#1E2025', borderRadius: '10px', padding: '8px 16px', textAlign: 'center', marginBottom: '12px' }}>
          <p style={{ color: '#8B8F9B', fontSize: '12px', margin: 0 }}>Unknown caller</p>
        </div>
      )}

      {/* Number input */}
      <div style={{ width: '100%', position: 'relative', marginBottom: '8px' }}>
        <input
          value={number}
          onChange={e => setNumber(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCall()}
          placeholder="Enter number"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'transparent', border: 'none', outline: 'none',
            textAlign: 'center', fontSize: '28px', fontWeight: 300,
            color: '#FFFFFF', padding: '8px 40px 8px 8px',
            fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif",
            letterSpacing: '1px',
          }}
        />
        {number && (
          <button
            onClick={backspace}
            style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8B8F9B', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <BackspaceIcon />
          </button>
        )}
      </div>

      {phoneNumber && (
        <p style={{ fontSize: '11px', color: '#8B8F9B', marginBottom: '16px' }}>Your number: <span style={{ color: '#FFFFFF' }}>{phoneNumber}</span></p>
      )}

      {/* 12-key pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', maxWidth: '300px', marginBottom: '24px' }}>
        {KEYS.map(({ key, sub }) => (
          <button
            key={key}
            onClick={() => pressKey(key)}
            style={{
              aspectRatio: '1 / 1', borderRadius: '50%', background: '#1E2025', border: '1px solid #2A2D35',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '1px', cursor: 'pointer', transition: 'background 0.1s',
              outline: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2A2D35'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E2025'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 600, lineHeight: 1 }}>{key}</span>
            {sub && <span style={{ color: '#8B8F9B', fontSize: '9px', letterSpacing: '1.5px' }}>{sub}</span>}
          </button>
        ))}
      </div>

      {/* Call button */}
      <button
        onClick={handleCall}
        disabled={!number.trim() || busy}
        style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: (!number.trim() || busy) ? '#2A2D35' : '#4CAF50',
          border: 'none', cursor: (!number.trim() || busy) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: (!number.trim() || busy) ? 'none' : '0 4px 20px rgba(76,175,80,0.4)',
          transition: 'all 0.15s',
          marginBottom: '8px',
        }}
      >
        <PhoneCallIcon />
      </button>

      {busy && (
        <p style={{ fontSize: '12px', color: '#FF6E00', marginBottom: '8px' }}>
          {phoneStatus === "ringing" ? "Incoming call…" : phoneStatus === "active" ? "In call" : "On hold"}
        </p>
      )}

      {/* Recent calls */}
      {recents.length > 0 && !busy && (
        <div style={{ width: '100%', marginTop: '16px' }}>
          <p style={{ fontSize: '11px', color: '#8B8F9B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', padding: '0 4px' }}>Recent</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {recents.map(log => {
              const num = log.direction === "inbound" ? log.from_number : log.to_number;
              const name = (log.direction === "inbound" ? log.from_name : log.to_name) || num || "?";
              return (
                <button
                  key={log.id}
                  onClick={() => { setNumber(num); onCall?.(num, name); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px', background: 'none',
                    border: 'none', cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1E2025'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <StatusIcon direction={log.direction} status={log.status} />
                  <span style={{ flex: 1, textAlign: 'left', fontSize: '14px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  <span style={{ fontSize: '12px', color: '#8B8F9B' }}>{fmtTime(log.started_at)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {recents.length === 0 && !busy && (
        <p style={{ fontSize: '13px', color: '#8B8F9B', marginTop: '12px' }}>No recent calls</p>
      )}
    </div>
  );
}
