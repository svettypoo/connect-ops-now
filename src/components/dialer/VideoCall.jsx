import { useState, useEffect, useRef } from "react";
import { Video, Phone, PhoneOff, X } from "lucide-react";
import api from "@/api/inboxAiClient";
import CallNotes from "@/components/dialer/CallNotes";

const JAAS_APP_ID = "vpaas-magic-cookie-e866a734fd5742ea83b9df9d3fab8807";

export default function VideoCall({ contactName, meetingRoom }) {
  const [status, setStatus] = useState("idle"); // idle | loading | active
  const [sessionId] = useState(() => "video-" + Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [roomName, setRoomName] = useState(meetingRoom || "");
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const timerRef = useRef(null);

  const startTimer = () => {
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
  };

  const startCall = async () => {
    setError(null);
    setStatus("loading");
    try {
      // Get JWT from Inbox AI
      const { token } = await api.getJaaSToken();
      const room = roomName || ("ops-" + Date.now());
      setRoomName(room);

      // Load JaaS external API
      if (!window.JitsiMeetExternalAPI) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://8x8.vc/" + JAAS_APP_ID + "/external_api.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const api2 = new window.JitsiMeetExternalAPI("8x8.vc", {
        roomName: JAAS_APP_ID + "/" + room,
        parentNode: containerRef.current,
        jwt: token,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          toolbarButtons: [
            "microphone", "camera", "desktop", "chat",
            "participants-pane", "tileview", "hangup",
            "fullscreen", "raisehand", "toggle-camera",
          ],
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
        userInfo: { displayName: contactName || "User" },
      });
      apiRef.current = api2;

      api2.addEventListener("videoConferenceJoined", () => { setStatus("active"); startTimer(); });
      api2.addEventListener("videoConferenceLeft", endCall);
      api2.addEventListener("errorOccurred", (e) => {
        console.error("Jitsi error:", e);
        setError("Video error: " + (e?.error?.message || "unknown"));
      });
    } catch (e) {
      setError("Failed to start video: " + e.message);
      setStatus("idle");
    }
  };

  const endCall = () => {
    clearInterval(timerRef.current);
    try { apiRef.current?.removeEventListener("videoConferenceJoined"); } catch {}
    try { apiRef.current?.removeEventListener("videoConferenceLeft"); } catch {}
    try { apiRef.current?.removeEventListener("errorOccurred"); } catch {}
    try { apiRef.current?.dispose(); } catch {}
    apiRef.current = null;
    setStatus("idle");
  };

  useEffect(() => () => { clearInterval(timerRef.current); try { apiRef.current?.dispose(); } catch {} }, []);

  const fmt = (s) => String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12122a] border border-white/5">
      {status === "idle" ? (
        <div className="flex flex-col items-center gap-4 p-8">
          <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center">
            <Video className="w-9 h-9 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">{contactName || "Video Call"}</p>
            <p className="text-slate-400 text-sm mt-1">HD video with virtual backgrounds</p>
          </div>
          {roomName && (
            <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-slate-400">
              Room: <span className="text-[#0EB8FF]">{roomName}</span>
            </div>
          )}
          <input value={roomName} onChange={e => setRoomName(e.target.value)}
            placeholder="Custom room name (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0EB8FF]/40" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={startCall}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white flex items-center justify-center gap-2 transition-all">
            <Video className="w-5 h-5" /> Start Video Call
          </button>
        </div>
      ) : (
        <div className="relative">
          <div ref={containerRef} style={{ height: 480, minHeight: 400 }} />
          {status === "loading" && (
            <div className="absolute inset-0 bg-[#0d0d1f] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-600 border-t-[#0EB8FF] rounded-full animate-spin" />
            </div>
          )}
          {status === "active" && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white font-mono">{fmt(elapsed)}</span>
            </div>
          )}
        </div>
      )}
      {status === "idle" && elapsed > 0 && (
        <CallNotes sessionId={sessionId} callType="video" durationMinutes={Math.round(elapsed / 60)} />
      )}
    </div>
  );
}
