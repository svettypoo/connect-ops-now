import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState("hr@stproperties.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try { await login(email, password); }
    catch (e) { setErr(e.message || "Login failed"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "-apple-system, 'SF Pro Display', Roboto, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#FF6E00', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(255,110,0,0.35)' }}>
            <span style={{ fontWeight: 900, color: '#fff', fontSize: '32px', letterSpacing: '-1px' }}>R</span>
          </div>
        </div>

        {/* Titles */}
        <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 700, textAlign: 'center', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>Connect Ops</h1>
        <p style={{ color: '#8B8F9B', fontSize: '14px', textAlign: 'center', margin: '0 0 36px 0' }}>Business Communications</p>

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
