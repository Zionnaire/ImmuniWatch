import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { authApi, type InviteInfo } from "../api/auth";

type PageState = "loading" | "ready" | "invalid" | "expired" | "used" | "success";

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#c0392b", "#d97706", "#F4A261", "#5BA4CF", "#00897b"];
  return { score, label: labels[score] ?? "Very weak", color: colors[score] ?? "#c0392b" };
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(13,61,61,0.18)", background: "rgba(255,255,255,0.90)",
  color: "#0f2626", borderRadius: "12px", padding: "11px 14px", fontSize: "14px",
  width: "100%", outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "6px",
  color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif',
  letterSpacing: "0.04em", textTransform: "uppercase",
};

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [state, setState] = useState<PageState>("loading");
  const [info, setInfo]   = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    authApi.getInvite(token)
      .then((data) => { setInfo(data); setState("ready"); })
      .catch((err: unknown) => {
        const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
        if (code === "INVITE_EXPIRED") setState("expired");
        else if (code === "INVITE_ALREADY_USED") setState("used");
        else setState("invalid");
      });
  }, [token]);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await authApi.acceptInvite(token!, password);
      setState("success");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const pw      = strength(password);
  const mismatch = confirm.length > 0 && password !== confirm;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#00897b" }} />
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center px-4">
        <div className="glass-elevated max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(0,137,123,0.12)", border: "1px solid rgba(0,137,123,0.20)" }}>
            <CheckCircle className="h-8 w-8" style={{ color: "#00897b" }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>Password set!</h1>
          <p className="text-sm mb-2" style={{ color: "#4a6060" }}>Your account is ready. Redirecting you to sign in…</p>
          <p className="text-xs mb-6" style={{ color: "#8da8a8" }}>
            Use <strong>{info?.email}</strong> and the password you just created.
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary w-full py-2.5 text-sm font-semibold">
            Go to Login now
          </button>
        </div>
      </div>
    );
  }

  // ── Error states ───────────────────────────────────────────────────────────
  if (state === "invalid" || state === "expired" || state === "used") {
    const messages: Record<string, { title: string; body: string }> = {
      invalid: { title: "Invalid invite link",  body: "This invite link is not valid. It may have been deleted or never existed."                                      },
      expired: { title: "Invite link expired",  body: "This invite link expired after 72 hours. Ask your administrator to resend a new invite."                       },
      used:    { title: "Already accepted",     body: "This invite has already been used. If you forgot your password, contact your administrator."                   },
    };
    const m = messages[state]!;
    return (
      <div className="min-h-screen app-bg flex items-center justify-center px-4">
        <div className="glass-elevated max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.18)" }}>
            <AlertCircle className="h-8 w-8" style={{ color: "#c0392b" }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>{m.title}</h1>
          <p className="text-sm mb-6" style={{ color: "#4a6060" }}>{m.body}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2.5 text-sm font-semibold rounded-xl"
            style={{ background: "rgba(13,61,61,0.07)", color: "#4a6060", border: "1px solid rgba(13,61,61,0.14)" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Set password form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4 py-8">
      <div className="glass-elevated max-w-md w-full p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0d3d3d" }}>
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>Welcome to ImmuniWatch</h1>
            <p className="text-xs" style={{ color: "#8da8a8" }}>
              {info?.orgName ? `${info.orgName} · ` : ""}
              {info?.role?.replace("_", " ")}
            </p>
          </div>
        </div>

        {/* User strip */}
        <div className="rounded-xl px-4 py-3 mb-6" style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.18)" }}>
          <p className="text-xs" style={{ color: "#005048" }}>
            Setting password for <strong>{info?.name}</strong> ({info?.email})
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={labelStyle}>
              Create Password <span style={{ color: "#8da8a8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(min 8 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                required
                style={{ ...inputStyle, paddingRight: "42px" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#8da8a8" }}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-1.5">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i < pw.score ? pw.color : "rgba(13,61,61,0.08)" }} />
                  ))}
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "#8da8a8" }}>{pw.label}</p>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              style={{ ...inputStyle, borderColor: mismatch ? "rgba(192,57,43,0.40)" : "rgba(13,61,61,0.18)" }}
            />
            {mismatch && <p className="text-[11px] mt-1" style={{ color: "#c0392b" }}>Passwords do not match</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.18)" }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#c0392b" }} />
              <p className="text-xs" style={{ color: "#c0392b" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || password.length < 8 || password !== confirm}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Setting password…" : "Set Password & Access Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
