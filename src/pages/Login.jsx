import { useEffect } from "react";
import { Phone } from "lucide-react";

export default function LoginPage() {
  useEffect(() => {
    // SSO handles all login — redirect to SSO portal
    window.location.href = 'https://sso.stproperties.com?return_to=' + encodeURIComponent(window.location.origin);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
          <Phone size={38} color="#fff" strokeWidth={1.8} />
        </div>
        <h1 style={{ color: '#e2e8f0', fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>S&T Phone</h1>
        <p style={{ color: 'rgba(150,175,210,0.5)', fontSize: '0.85rem', marginBottom: '24px' }}>Redirecting to sign in...</p>
        <a
          href="https://sso.stproperties.com"
          style={{
            display: 'inline-block', padding: '12px 24px', borderRadius: '12px',
            background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', color: '#fff',
            textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
            boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
          }}
        >
          Sign in with S&T SSO
        </a>
      </div>
    </div>
  );
}
