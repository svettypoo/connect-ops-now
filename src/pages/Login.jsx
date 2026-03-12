import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";

const LS_KEY = "con_remember";

export default function LoginPage() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState("hr@stproperties.com");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved?.email) { setEmail(saved.email); setPassword(saved.password || ""); setRemember(true); }
    } catch {}
  }, []);

  // Starfield
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * 2000, y: Math.random() * 1200,
      r: Math.random() * 1.2 + 0.3, a: Math.random(), s: Math.random() * 0.003 + 0.001
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      stars.forEach(s => {
        s.a += s.s;
        const o = 0.3 + Math.abs(Math.sin(s.a)) * 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,210,255,${o * 0.35})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      if (remember) {
        localStorage.setItem(LS_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(LS_KEY);
      }
    } catch (e) {
      setErr(e.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", position: 'relative' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Card */}
        <div style={{ background: 'rgba(12,18,35,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(80,120,200,0.12)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}>

          {/* Header */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(80,120,200,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(150,175,210,0.5)" strokeWidth="1.5"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z"/></svg>
            <span style={{ fontSize: '0.82rem', color: 'rgba(180,200,225,0.6)', fontWeight: 500, letterSpacing: '0.5px' }}>User Login</span>
          </div>

          {/* Body */}
          <div style={{ padding: '2rem 2rem 1.75rem' }}>
            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
                <Phone size={38} color="#fff" strokeWidth={1.8} />
              </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.35rem 0' }}>
              S&T Phone
            </h2>
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(100,140,180,0.45)', marginBottom: '1.5rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Business Communications
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(80,120,200,0.12)', borderRadius: '12px', background: 'rgba(15,23,42,0.5)', overflow: 'hidden', transition: 'all 0.3s' }}>
                <div style={{ width: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', borderRight: '1px solid rgba(80,120,200,0.08)' }}>
                  <Mail size={16} color="rgba(100,140,180,0.4)" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 14px', fontSize: '0.85rem', color: '#c8d6e5', background: 'transparent', fontFamily: 'inherit' }}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(80,120,200,0.12)', borderRadius: '12px', background: 'rgba(15,23,42,0.5)', overflow: 'hidden', transition: 'all 0.3s' }}>
                <div style={{ width: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', borderRight: '1px solid rgba(80,120,200,0.08)' }}>
                  <Lock size={16} color="rgba(100,140,180,0.4)" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 14px', fontSize: '0.85rem', color: '#c8d6e5', background: 'transparent', fontFamily: 'inherit' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 12px', color: 'rgba(100,140,180,0.4)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Remember me */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ width: '15px', height: '15px', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <span style={{ color: 'rgba(150,175,210,0.5)', fontSize: '0.8rem' }}>Remember me</span>
              </label>

              {(err || authError?.message) && (
                <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '2px 0 0', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '10px 12px' }}>
                  {err || authError?.message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: '44px', borderRadius: '12px', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
                  color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                  marginTop: '8px', transition: 'all 0.3s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.25)',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? "Signing in\u2026" : "Sign In"}
              </button>
            </form>

            {/* Footer inside card */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(80,120,200,0.06)' }}>
              <span style={{ color: 'rgba(100,140,180,0.3)', fontSize: '0.68rem', letterSpacing: '0.5px' }}>Powered by Telnyx &middot; Jitsi &middot; Claude AI</span>
            </div>
          </div>
        </div>

        {/* Footer outside card */}
        <p style={{ color: 'rgba(100,140,180,0.25)', fontSize: '0.68rem', textAlign: 'center', marginTop: '1.5rem', letterSpacing: '0.5px' }}>
          &copy; 2026 S&T Properties &middot; All rights reserved
        </p>
      </div>
    </div>
  );
}
