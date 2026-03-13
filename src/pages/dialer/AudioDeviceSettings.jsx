import { useState, useEffect } from 'react';

// AudioDeviceSettings — mic/speaker selection + test
export default function AudioDeviceSettings({ onBack }) {
  const [mics, setMics] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selMic, setSelMic] = useState(localStorage.getItem('con_mic_id') || '');
  const [selSpk, setSelSpk] = useState(localStorage.getItem('con_spk_id') || '');
  const [micTesting, setMicTesting] = useState(false);
  const [spkTesting, setSpkTesting] = useState(false);
  const [micResult, setMicResult] = useState(''); // 'ok' | 'error'

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setMics(devs.filter(d => d.kind === 'audioinput'));
      setSpeakers(devs.filter(d => d.kind === 'audiooutput'));
    }).catch(() => {});
  }, []);

  const saveMic = (id) => { setSelMic(id); localStorage.setItem('con_mic_id', id); };
  const saveSpk = (id) => { setSelSpk(id); localStorage.setItem('con_spk_id', id); };

  const testMic = async () => {
    setMicTesting(true); setMicResult('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: selMic ? { deviceId: selMic } : true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(() => {});
        audio.onended = () => URL.revokeObjectURL(url);
        setMicTesting(false); setMicResult('ok');
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 3000);
    } catch { setMicTesting(false); setMicResult('error'); }
  };

  const testSpeaker = () => {
    setSpkTesting(true);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => { ctx.close(); setSpkTesting(false); };
  };

  const sLabel = { fontSize:'11px', color:'#6b84a8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' };
  const sSelect = {
    width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:'10px', padding:'8px 12px', color:'#fff', fontSize:'13px', outline:'none',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0e1a' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#6b84a8', cursor:'pointer', padding:'4px', display:'flex' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style={{ color:'#fff', fontSize:'15px', fontWeight:600 }}>Audio Devices</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:'24px' }}>
        {/* Microphone */}
        <div>
          <p style={sLabel}>Microphone</p>
          <select value={selMic} onChange={e => saveMic(e.target.value)} style={sSelect}>
            <option value="">System default</option>
            {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic ' + m.deviceId.slice(0,6)}</option>)}
          </select>
          <button onClick={testMic} disabled={micTesting}
            style={{ marginTop:'10px', padding:'8px 16px', borderRadius:'10px', background:'rgba(14,184,255,0.1)', border:'1px solid rgba(14,184,255,0.2)', color:'#60a5fa', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: micTesting ? 0.5 : 1 }}>
            {micTesting ? 'Recording 3s… play back' : '🎙 Test mic (3s record + play)'}
          </button>
          {micResult === 'ok' && <p style={{ color:'#4CAF50', fontSize:'12px', marginTop:'6px' }}>Mic working — you should hear playback</p>}
          {micResult === 'error' && <p style={{ color:'#F44336', fontSize:'12px', marginTop:'6px' }}>Mic access failed — check permissions</p>}
        </div>
        {/* Speaker */}
        <div>
          <p style={sLabel}>Speaker / Output</p>
          <select value={selSpk} onChange={e => saveSpk(e.target.value)} style={sSelect}>
            <option value="">System default</option>
            {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speaker ' + s.deviceId.slice(0,6)}</option>)}
          </select>
          <button onClick={testSpeaker} disabled={spkTesting}
            style={{ marginTop:'10px', padding:'8px 16px', borderRadius:'10px', background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.2)', color:'#4CAF50', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: spkTesting ? 0.5 : 1 }}>
            {spkTesting ? 'Playing beep…' : '🔊 Test speaker (play beep)'}
          </button>
        </div>
        <p style={{ fontSize:'11px', color:'#243352', textAlign:'center' }}>Device selections are saved and applied to all calls</p>
      </div>
    </div>
  );
}
