import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Phone, Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B00, #FF8C38)" }}>
            <Phone className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-2">Connect Ops</h1>
        <p className="text-slate-400 text-sm text-center mb-8">Business communications platform</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#0EB8FF]/50" required />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-[#0EB8FF]/50" required />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {(err || authError?.message) && <p className="text-red-400 text-sm text-center">{err || authError?.message}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white transition-all"
            style={{ background: loading ? "#555" : "linear-gradient(135deg, #0684BD, #0EB8FF)" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-slate-600 text-xs text-center mt-6">Powered by Telnyx · Jitsi · Claude AI</p>
      </div>
    </div>
  );
}
