import { useState } from "react";
import { useNotificationSettings, startRingtone, stopRingtone, playMessageSound } from "@/lib/useNotificationSettings";

// ── Shared UI primitives ───────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, color: "#0684BD", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px", padding: "0 16px" }}>{title}</p>
      <div style={{ background: "#1E2025", borderRadius: "14px", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, sub, children, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px",
      borderBottom: last ? "none" : "1px solid #2A2D35",
    }}>
      <div>
        <p style={{ margin: 0, fontSize: "14px", color: "#FFFFFF", fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#8B8F9B" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: "48px", height: "28px", borderRadius: "14px", border: "none", cursor: "pointer",
        background: value ? "#0684BD" : "#3A3D45", position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: "3px", left: value ? "23px" : "3px",
        width: "22px", height: "22px", borderRadius: "50%", background: "#FFFFFF",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "#2A2D35", border: "1px solid #3A3D45", borderRadius: "8px",
        color: "#FFFFFF", fontSize: "13px", padding: "6px 10px", cursor: "pointer", outline: "none",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function VolumeSlider({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "160px" }}>
      <span style={{ fontSize: "16px" }}>🔈</span>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#0684BD" }}
      />
      <span style={{ fontSize: "16px" }}>🔊</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function NotificationSettings() {
  const { settings, update } = useNotificationSettings();
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const testRingtone = () => {
    startRingtone(settings);
    setTimeout(stopRingtone, 3000);
  };

  const testMessage = () => playMessageSound(settings);

  const RINGTONES = [
    { value: "classic", label: "Classic Ring" },
    { value: "digital", label: "Digital" },
    { value: "pulse",   label: "Pulse" },
    { value: "silent",  label: "Silent" },
  ];

  const MESSAGE_SOUNDS = [
    { value: "chime",  label: "Chime" },
    { value: "ping",   label: "Ping" },
    { value: "silent", label: "Silent" },
  ];

  return (
    <div style={{
      height: "100%", overflowY: "auto", padding: "24px 16px",
      fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif",
      background: "#17191C", color: "#FFFFFF",
    }}>
      <p style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 24px 0", padding: "0 0 0 4px" }}>Notifications & Sounds</p>

      {/* Browser / OS permissions */}
      <Section title="Permissions">
        <Row label="Desktop Notifications" sub={notifPermission === "granted" ? "Allowed — you'll see popups for calls" : "Allow popups for incoming calls"}>
          {notifPermission === "granted" ? (
            <span style={{ fontSize: "12px", color: "#4CAF50", fontWeight: 600 }}>Enabled</span>
          ) : (
            <button
              onClick={requestNotifPermission}
              style={{ background: "#0684BD", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}
            >
              Enable
            </button>
          )}
        </Row>
      </Section>

      {/* Phone Calls */}
      <Section title="Phone Calls">
        <Row label="Ring on incoming call">
          <Toggle value={settings.ringOnCall} onChange={v => update({ ringOnCall: v })} />
        </Row>
        <Row label="Ringtone" sub="Plays when a call comes in">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Select value={settings.ringtone} onChange={v => update({ ringtone: v })} options={RINGTONES} />
            <button onClick={testRingtone} style={{ background: "#2A2D35", border: "1px solid #3A3D45", borderRadius: "8px", color: "#C8CAD0", fontSize: "12px", padding: "6px 10px", cursor: "pointer" }}>
              Test
            </button>
          </div>
        </Row>
        <Row label="Ring Volume">
          <div style={{ minWidth: "180px" }}>
            <VolumeSlider value={settings.ringVolume} onChange={v => update({ ringVolume: v })} />
          </div>
        </Row>
        <Row label="Vibrate on incoming call" sub="Requires device vibration support">
          <Toggle value={settings.vibrateOnCall} onChange={v => update({ vibrateOnCall: v })} />
        </Row>
        <Row label="Flash screen on incoming call" last>
          <Toggle value={settings.flashOnCall} onChange={v => update({ flashOnCall: v })} />
        </Row>
      </Section>

      {/* Messages */}
      <Section title="Messages & SMS">
        <Row label="Play sound for new messages">
          <Toggle value={settings.soundOnMessage} onChange={v => update({ soundOnMessage: v })} />
        </Row>
        <Row label="Message sound">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Select value={settings.messageSound} onChange={v => update({ messageSound: v })} options={MESSAGE_SOUNDS} />
            <button onClick={testMessage} style={{ background: "#2A2D35", border: "1px solid #3A3D45", borderRadius: "8px", color: "#C8CAD0", fontSize: "12px", padding: "6px 10px", cursor: "pointer" }}>
              Test
            </button>
          </div>
        </Row>
        <Row label="Vibrate for messages" last>
          <Toggle value={settings.vibrateOnMessage} onChange={v => update({ vibrateOnMessage: v })} />
        </Row>
      </Section>

      {/* Missed Calls */}
      <Section title="Missed Calls">
        <Row label="Notify on missed calls" last>
          <Toggle value={settings.notifyMissed} onChange={v => update({ notifyMissed: v })} />
        </Row>
      </Section>

      {/* Do Not Disturb */}
      <Section title="Do Not Disturb">
        <Row label="Enable Do Not Disturb" sub="Silences all calls and messages during set hours">
          <Toggle value={settings.dndEnabled} onChange={v => update({ dndEnabled: v })} />
        </Row>
        {settings.dndEnabled && (
          <>
            <Row label="Start time">
              <input
                type="time" value={settings.dndStart}
                onChange={e => update({ dndStart: e.target.value })}
                style={{ background: "#2A2D35", border: "1px solid #3A3D45", borderRadius: "8px", color: "#fff", fontSize: "14px", padding: "6px 10px", outline: "none" }}
              />
            </Row>
            <Row label="End time" last>
              <input
                type="time" value={settings.dndEnd}
                onChange={e => update({ dndEnd: e.target.value })}
                style={{ background: "#2A2D35", border: "1px solid #3A3D45", borderRadius: "8px", color: "#fff", fontSize: "14px", padding: "6px 10px", outline: "none" }}
              />
            </Row>
          </>
        )}
      </Section>

      <p style={{ fontSize: "12px", color: "#555", textAlign: "center", marginTop: "8px", paddingBottom: "32px" }}>
        Settings saved automatically to this device
      </p>
    </div>
  );
}
