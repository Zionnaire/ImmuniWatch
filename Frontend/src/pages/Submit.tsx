import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Send, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import axios from "axios";

type Platform = "twitter" | "facebook" | "youtube" | "submission";
type Language  = "en" | "pcm" | "ha" | "yo" | "ig";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "twitter",    label: "Twitter / X"      },
  { value: "facebook",   label: "Facebook"          },
  { value: "youtube",    label: "YouTube"           },
  { value: "submission", label: "Other / Unknown"   },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en",  label: "English"         },
  { value: "pcm", label: "Nigerian Pidgin" },
  { value: "ha",  label: "Hausa"           },
  { value: "yo",  label: "Yoruba"          },
  { value: "ig",  label: "Igbo"            },
];

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.90)",
  color: "#0f2626", borderRadius: "12px", padding: "10px 13px", fontSize: "14px",
  width: "100%", outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "6px",
  color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif',
  letterSpacing: "0.04em", textTransform: "uppercase",
};

export default function Submit() {
  const [content,       setContent]       = useState("");
  const [platformSeen,  setPlatformSeen]  = useState<Platform>("facebook");
  const [language,      setLanguage]      = useState<Language>("en");
  const [sourceUrl,     setSourceUrl]     = useState("");
  const [submitterNote, setSubmitterNote] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [error,         setError]         = useState("");

  async function handleSubmit() {
    setError("");
    if (content.trim().length < 10) {
      setError("Please provide at least 10 characters of content.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/submit", { content, platformSeen, language, sourceUrl, submitterNote });
      setSuccess(true);
    } catch (err) {
      const data   = axios.isAxiosError(err) ? (err.response?.data as Record<string, unknown> | undefined) : undefined;
      const apiMsg = typeof data?.error === "string" ? data.error : typeof data?.message === "string" ? data.message : null;
      setError(apiMsg ?? "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setContent(""); setSourceUrl(""); setSubmitterNote("");
    setPlatformSeen("facebook"); setLanguage("en");
    setSuccess(false); setError("");
  }

  // ── Shared nav bar ──────────────────────────────────────────────────────────
  const Nav = (
    <nav
      className="glass-topbar sticky top-0 z-50 flex items-center gap-3 px-5 md:px-10"
      style={{ height: "64px" }}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: "#4a6060" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#0f2626"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4a6060"; }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        Back to Home
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "#0d3d3d" }}
        >
          <ShieldCheck style={{ width: "14px", height: "14px", color: "#a7f3d0" }} />
        </div>
        <span className="font-bold text-sm hidden sm:inline" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>
          ImmuniWatch
        </span>
      </div>
    </nav>
  );

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen app-bg">
        {Nav}
        <div className="flex items-center justify-center px-4 py-16">
          <div className="glass-elevated max-w-md w-full p-10 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(0,137,123,0.10)", border: "1px solid rgba(0,137,123,0.20)" }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: "#00897b" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif" }}>
              Report received
            </h2>
            <p className="text-sm mb-1.5 leading-relaxed" style={{ color: "#4a6060" }}>
              Thank you for helping protect public health in Nigeria. Our team
              will review this claim and take appropriate action.
            </p>
            <p className="text-xs mb-8" style={{ color: "#8da8a8" }}>
              All submissions are anonymous — we do not store personal information.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={{ background: "rgba(13,61,61,0.07)", color: "#0d3d3d", border: "1px solid rgba(13,61,61,0.16)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.07)"; }}
              >
                Submit another
              </button>
              <Link
                to="/"
                className="flex-1 btn-primary flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold"
              >
                <ArrowLeft style={{ width: "14px", height: "14px" }} />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen app-bg">
      {Nav}

      <div className="flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#0d3d3d", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.02em" }}>
              Report Misinformation
            </h1>
            <p className="text-sm" style={{ color: "#4a6060" }}>
              No account needed. All submissions are reviewed by the ImmuniWatch Nigeria team.
            </p>
          </div>

          <div className="glass-elevated p-6">
            {/* Anonymous notice */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-5"
              style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.16)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00897b" }} />
              <p className="text-xs" style={{ color: "#005048" }}>
                <strong>Anonymous submission.</strong> We do not collect or store your personal information.
              </p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
              className="space-y-4"
            >
              {/* Content */}
              <div>
                <label style={labelStyle}>
                  Claim or post content <span style={{ color: "#c0392b", fontWeight: 700 }}>*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Paste or type the false health claim here…"
                  required
                  style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "#8da8a8" }}>
                  {content.length} / 5000 characters
                </p>
              </div>

              {/* Platform + Language */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Seen on</label>
                  <select
                    value={platformSeen}
                    onChange={(e) => setPlatformSeen(e.target.value as Platform)}
                    style={inputStyle}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    style={inputStyle}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source URL */}
              <div>
                <label style={labelStyle}>
                  Link to the post{" "}
                  <span style={{ color: "#8da8a8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>

              {/* Note */}
              <div>
                <label style={labelStyle}>
                  Additional context{" "}
                  <span style={{ color: "#8da8a8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  value={submitterNote}
                  onChange={(e) => setSubmitterNote(e.target.value)}
                  placeholder="e.g. spreading rapidly in my community, shared by a known account…"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.18)" }}
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#c0392b" }} />
                  <p className="text-xs" style={{ color: "#c0392b" }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || content.trim().length < 10}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {loading ? "Submitting…" : "Submit Report"}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] mt-4" style={{ color: "#8da8a8" }}>
            This service is operated by NPHCDA under the ImmuniWatch programme.
          </p>
        </div>
      </div>
    </div>
  );
}
