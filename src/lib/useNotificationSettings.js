import { useState, useCallback } from "react";

const KEY = "con_notif_settings";

const DEFAULTS = {
  // Calls
  ringOnCall: true,
  ringtone: "classic",       // classic | digital | pulse | silent
  ringVolume: 80,            // 0-100
  vibrateOnCall: true,
  flashOnCall: true,
  // Messages
  soundOnMessage: true,
  messageSound: "chime",     // chime | ping | silent
  vibrateOnMessage: true,
  // Missed calls
  notifyMissed: true,
  // Do Not Disturb
  dndEnabled: false,
  dndStart: "22:00",
  dndEnd: "07:00",
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState(load);

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  return { settings, update };
}

// ── Ringtone generator (AudioContext, no file needed) ──────────────────────
let _ringInterval = null;
let _audioCtx = null;

function getCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function playRingBurst(ringtone, volume) {
  try {
    const ctx = getCtx();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume / 100 * 0.4, ctx.currentTime);
    gain.connect(ctx.destination);

    const configs = {
      classic: [{ f: 480, d: 0.8 }, { f: 440, d: 0.8 }],
      digital: [{ f: 1400, d: 0.12 }, { f: 0, d: 0.08 }, { f: 1400, d: 0.12 }, { f: 0, d: 0.08 }, { f: 1400, d: 0.12 }],
      pulse:   [{ f: 880, d: 0.1 }, { f: 0, d: 0.1 }, { f: 880, d: 0.1 }, { f: 0, d: 0.1 }],
      chime:   [{ f: 1047, d: 0.15 }, { f: 1319, d: 0.15 }, { f: 1568, d: 0.25 }],
      ping:    [{ f: 1200, d: 0.2 }],
    };

    let t = ctx.currentTime;
    (configs[ringtone] || configs.classic).forEach(({ f, d }) => {
      if (f > 0) {
        const osc = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        g2.gain.setValueAtTime(volume / 100 * 0.35, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + d - 0.01);
        osc.connect(g2); g2.connect(gain);
        osc.start(t); osc.stop(t + d);
      }
      t += d;
    });
  } catch (_) {}
}

export function startRingtone(settings) {
  stopRingtone();
  const { ringtone, ringVolume, vibrateOnCall } = settings;
  if (ringtone === "silent" || !settings.ringOnCall) {
    // still vibrate
    if (vibrateOnCall) startVibrate("call");
    return;
  }
  // Play immediately then repeat every 4s
  playRingBurst(ringtone, ringVolume);
  _ringInterval = setInterval(() => playRingBurst(ringtone, ringVolume), 4000);
  if (vibrateOnCall) startVibrate("call");
}

export function stopRingtone() {
  if (_ringInterval) { clearInterval(_ringInterval); _ringInterval = null; }
  stopVibrate();
}

// ── Vibration ──────────────────────────────────────────────────────────────
let _vibrateInterval = null;

const VIBRATE_PATTERNS = {
  call:    [400, 200, 400, 600],   // ring-ring pause pattern
  message: [100, 50, 100],
};

export function startVibrate(type = "call") {
  stopVibrate();
  if (!navigator.vibrate) return;
  const pattern = VIBRATE_PATTERNS[type] || VIBRATE_PATTERNS.call;
  navigator.vibrate(pattern);
  _vibrateInterval = setInterval(() => navigator.vibrate(pattern), 4000);
}

export function stopVibrate() {
  if (_vibrateInterval) { clearInterval(_vibrateInterval); _vibrateInterval = null; }
  try { navigator.vibrate(0); } catch (_) {}
}

export function playMessageSound(settings) {
  if (!settings.soundOnMessage || settings.messageSound === "silent") return;
  playRingBurst(settings.messageSound, settings.ringVolume);
  if (settings.vibrateOnMessage) {
    try { navigator.vibrate(VIBRATE_PATTERNS.message); } catch (_) {}
  }
}
