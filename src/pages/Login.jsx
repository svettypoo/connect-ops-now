import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { User, Lock, Eye, EyeOff } from "lucide-react";

const LS_KEY = "con_remember";

export default function LoginPage() {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState("hr@stproperties.com");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const inputRow = {
    display: 'flex', alignItems: 'center',
    border: '1px solid #d0d5dd', borderRadius: '4px',
    background: '#fff', overflow: 'hidden',
  };
  const iconBox = {
    width: '40px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f0f4f8', borderRight: '1px solid #d0d5dd', alignSelf: 'stretch',
  };
  const inputStyle = {
    flex: 1, border: 'none', outline: 'none', padding: '11px 12px',
    fontSize: '14px', color: '#333', background: 'transparent',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#e8edf2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "Arial, 'Helvetica Neue', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '6px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>

          {/* Header bar */}
          <div style={{ background: '#f7f9fb', borderBottom: '1px solid #dde3ea', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#555" />
            <span style={{ fontSize: '14px', color: '#444', fontWeight: 500 }}>User Login</span>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px 24px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: '#0684BD', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(6,132,189,0.3)' }}>
                <span style={{ fontSize: '44px', lineHeight: 1 }}>📞</span>
              </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600, color: '#333', margin: '0 0 24px 0' }}>
              stproperties.com Phone
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Email */}
              <div style={inputRow}>
                <div style={iconBox}><User size={15} color="#777" /></div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div style={inputRow}>
                <div style={iconBox}><Lock size={15} color="#777" /></div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px', color: '#777', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Remember me */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', userSelect: 'none', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#0684BD', cursor: 'pointer' }}
                />
                <span style={{ color: '#555', fontSize: '13px' }}>Remember me</span>
              </label>

              {(err || authError?.message) && (
                <p style={{ color: '#c0392b', fontSize: '13px', margin: '2px 0 0', background: '#fdf3f2', border: '1px solid #f5c6cb', borderRadius: '4px', padding: '8px 10px' }}>
                  {err || authError?.message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: '40px', borderRadius: '4px', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#95a3b0' : '#0684BD',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  marginTop: '6px', transition: 'background 0.15s',
                }}
              >
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: '#7a8898', fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
          Powered by Telnyx · Jitsi · Claude AI
        </p>
      </div>
    </div>
  );
}
