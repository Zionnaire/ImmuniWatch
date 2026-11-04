import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { authApi } from "../api/auth";

type PageState = "loading" | "ready" | "invalid" | "expired" | "claimed" | "success";

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

export default function ClaimOrg() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [state, setState]   = useState<PageState>("loading");
  const [orgName, setOrgName] = useState("");
  const [region, setRegion]   = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    authApi.getOrgClaim(token)
      .then((d) => { setOrgName(d.orgName); setRegion(`${d.region}, ${d.state}`); setState("ready"); })
      .catch((err: unknown) => {
        const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
        if (code === "CLAIM_EXPIRED") setState("expired");
        else if (code === "CLAIM_ALREADY_USED") setState("claimed");
        else setState("invalid");
      });
  }, [token]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await authApi.acceptOrgClaim({ token: token!, name: form.name, email: form.email, password: form.password });
      setState("success");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const pw = strength(form.password);
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;

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
          <h1 className="text-xl font-bold mb-2" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>You're all set!</h1>
          <p className="text-sm mb-2" style={{ color: "#4a6060" }}>
            Your administrator account for <strong>{orgName}</strong> has been created. Redirecting to login…
          </p>
          <p className="text-xs mb-6" style={{ color: "#8da8a8" }}>
            Sign in with <strong>{form.email}</strong> and the password you just set.
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary w-full py-2.5 text-sm font-semibold">
            Go to Login now
          </button>
        </div>
      </div>
    );
  }

  // ── Error states ───────────────────────────────────────────────────────────
  if (state !== "ready") {
    const messages: Record<string, { title: string; body: string }> = {
      invalid: { title: "Invalid link",       body: "This invite link is not valid. It may have been revoked or never existed. Contact the platform administrator."       },
      expired: { title: "Link expired",       body: "This invite link has expired. Ask the platform admin to generate a new one for your organization."                   },
      claimed: { title: "Already registered", body: "An administrator has already been registered for this organization. If you need access, contact your org admin."     },
    };
    const m = messages[state] ?? messages.invalid;
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

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4 py-8">
      <div className="glass-elevated max-w-md w-full p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0d3d3d" }}>
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>Set Up Your Admin Account</h1>
            <p className="text-xs" style={{ color: "#8da8a8" }}>ImmuniWatch Platform</p>
          </div>
        </div>

        {/* Org strip */}
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5" style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.18)" }}>
          <Building2 className="h-5 w-5 flex-shrink-0" style={{ color: "#00897b" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#0d3d3d" }}>{orgName}</p>
            <p className="text-[11px]" style={{ color: "#00897b" }}>{region}</p>
          </div>
        </div>

        <p className="text-xs mb-4" style={{ color: "#4a6060" }}>
          You're registering as the <strong>Organization Admin</strong> for <strong>{orgName}</strong>. Fill in your details and create a secure password to complete setup.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label style={labelStyle}>Your Full Name</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Dr. Musa Ibrahim" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Your Email Address</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@healthcenter.gov.ng" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Create Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min 8 characters"
                required
                style={{ ...inputStyle, paddingRight: "42px" }}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8da8a8" }}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.password.length > 0 && (
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
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
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
            disabled={saving || !form.name || !form.email || form.password.length < 8 || form.password !== form.confirm}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-60 mt-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating account…" : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
