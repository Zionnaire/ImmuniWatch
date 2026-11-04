import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";

function apiCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
}
function apiMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(13,61,61,0.18)",
  background: "rgba(255,255,255,0.90)",
  color: "#0f2626",
  borderRadius: "12px",
  padding: "11px 14px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  marginBottom: "6px",
  color: "#4a6060",
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (!isAxiosError(err)) { setError("An unexpected error occurred. Please try again."); return; }
      const code = apiCode(err);
      if (code === "INVITE_PENDING") {
        setError("You must accept your invite link and set a password before you can sign in. Check your email for the invite link.");
        return;
      }
      if (code === "ACCOUNT_DEACTIVATED") { navigate("/deactivated", { replace: true }); return; }
      if (!err.response)             { setError("Cannot reach the server. Check your internet connection and try again."); return; }
      if (err.response.status === 401) { setError("Invalid email or password."); return; }
      if (err.response.status === 503) { setError("Service temporarily unavailable. Please try again in a moment."); return; }
      setError(apiMessage(err) ?? "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: "#0d3d3d", boxShadow: "0 8px 24px rgba(13,61,61,0.30)" }}>
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>ImmuniWatch</h1>
          <p className="text-sm" style={{ color: "#4a6060" }}>Nigeria · Vaccine Misinformation Monitoring</p>
        </div>

        {/* Card */}
        <div className="glass-elevated p-7">
          <h2 className="text-lg font-bold mb-1" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>Sign in</h2>
          <p className="text-xs mb-6" style={{ color: "#8da8a8" }}>Enter your credentials to access the command centre</p>

          <form
            onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
            className="space-y-4"
          >
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="you@healthcenter.gov.ng"
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: "42px" }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  style={{ color: "#8da8a8" }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.18)" }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#c0392b" }} />
                <p className="text-xs leading-relaxed" style={{ color: "#c0392b" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-60 mt-2"
            >
              {loading ? <><Spinner size="sm" /> Signing in…</> : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#8da8a8" }}>
          New to ImmuniWatch?{" "}
          <span style={{ color: "#4a6060" }}>Check your email for an invite link from your administrator.</span>
        </p>
      </div>
    </div>
  );
}
