import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/inboxAiClient';

// Audio player with progress bar, seek, download, share, and speed controls
export default function RecordingPlayer({ recordingId, isPlaying, onToggle, audioRef }) {
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);   // 0-1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressInterval = useRef(null);
  const speeds = [1, 1.5, 2];
  const url = api.streamRecording(recordingId);

  // Track playback progress
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        const a = audioRef.current;
        if (a && a.duration && isFinite(a.duration)) {
          setProgress(a.currentTime / a.duration);
          setCurrentTime(a.currentTime);
          setDuration(a.duration);
        }
      }, 200);
    } else {
      clearInterval(progressInterval.current);
      if (!isPlaying) setProgress(0);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying, audioRef]);

  const fmtTime = (secs) => {
    if (!secs || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  const seek = (e) => {
    e.stopPropagation();
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
      setProgress(pct);
    }
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const download = (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${recordingId}.webm`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const share = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try { await navigator.share({ title: 'Call Recording', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{ background: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', flexShrink: 0, cursor: 'pointer', color: '#60a5fa', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={isPlaying ? 'Stop' : 'Play'}>
          {isPlaying ? '⏹' : '▶'}
        </button>
        <button onClick={cycleSpeed}
          style={{ background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', color: speed > 1 ? '#60a5fa' : '#6b84a8', fontSize: '10px', fontWeight: 700, minWidth: '32px' }}
          title="Playback speed">
          {speed}x
        </button>
        <button onClick={download}
          style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Download">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button onClick={share}
          style={{ background: 'rgba(139,92,246,0.1)', border: 'none', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Share / Copy link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>
      {/* Progress bar with seek */}
      {isPlaying && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 2px' }}>
          <span style={{ fontSize: '9px', color: '#6b84a8', minWidth: '28px', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(currentTime)}</span>
          <div
            onClick={seek}
            style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            title="Click to seek"
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: (progress * 100) + '%',
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              borderRadius: '3px',
              transition: 'width 0.15s linear',
            }} />
            <div style={{
              position: 'absolute', top: '-2px',
              left: `calc(${progress * 100}% - 5px)`,
              width: '10px', height: '10px',
              borderRadius: '50%', background: '#60a5fa',
              boxShadow: '0 0 4px rgba(96,165,250,0.5)',
              transition: 'left 0.15s linear',
            }} />
          </div>
          <span style={{ fontSize: '9px', color: '#6b84a8', minWidth: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(duration)}</span>
        </div>
      )}
    </div>
  );
}
