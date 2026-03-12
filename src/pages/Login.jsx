import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Eye, EyeOff } from "lucide-react";

const LS_KEY = "con_remember";

export default function LoginPage() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState("hr@stproperties.com");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved?.email) { setEmail(saved.email); setPassword(saved.password || ""); setRemember(true); }
    } catch {}
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
    <div style={{ minHeight: '100vh', background: '#17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#0684BD', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(6,132,189,0.35)' }}>
            <span style={{ fontSize: '36px' }}>📞</span>
          </div>
        </div>

        {/* Titles */}
        <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 700, textAlign: 'center', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>S&amp;T Phone</h1>
        <p style={{ color: '#8B8F9B', fontSize: '14px', textAlign: 'center', margin: '0 0 36px 0' }}>S&amp;T Properties Communications</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1E2025', border: '1px solid #2A2D35', borderRadius: '12px',
              padding: '14px 16px', color: '#FFFFFF', fontSize: '15px',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#0684BD'}
            onBlur={e => e.target.style.borderColor = '#2A2D35'}
          />

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1E2025', border: '1px solid #2A2D35', borderRadius: '12px',
                padding: '14px 48px 14px 16px', color: '#FFFFFF', fontSize: '15px',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0684BD'}
              onBlur={e => e.target.style.borderColor = '#2A2D35'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8B8F9B', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Remember me */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#0684BD', cursor: 'pointer' }}
            />
            <span style={{ color: '#8B8F9B', fontSize: '13px' }}>Remember me</span>
          </label>

          {(err || authError?.message) && (
            <p style={{ color: '#F44336', fontSize: '13px', textAlign: 'center', margin: '0' }}>
              {err || authError?.message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: '48px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#2A2D35' : '#0684BD', color: '#FFFFFF', fontSize: '16px', fontWeight: 600,
              marginTop: '4px', transition: 'background 0.15s',
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ color: '#8B8F9B', fontSize: '11px', textAlign: 'center', marginTop: '32px' }}>
          Powered by Telnyx · Jitsi · Claude AI
        </p>
      </div>
    </div>
  );
}
