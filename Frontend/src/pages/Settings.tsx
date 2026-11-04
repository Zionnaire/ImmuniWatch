import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Info, AlertCircle, CheckCircle, SlidersHorizontal } from "lucide-react";
import { settingsApi } from "../api/settings";
import { FullPageSpinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useViewerMode } from "../context/ViewerModeContext";
import type { AppSettings } from "../types/api";

// ── Number setting row ─────────────────────────────────────────────────────────
function NumberSetting({
  label,
  description,
  fieldKey,
  value,
  unit,
  min,
  max,
  step,
  readOnly,
  onSave,
}: {
  label: string;
  description: string;
  fieldKey: keyof Omit<AppSettings, "systemInfo" | "updatedAt" | "notifEmail">;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  onSave: (key: string, value: number) => Promise<void>;
}) {
  const toast = useToast().toast;
  const [val, setVal] = useState(value);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    try {
      await onSave(fieldKey, val);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      toast.error("Save failed", `Could not update "${label}". Please try again.`);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (val !== value && status === "idle") setVal(value);

  const btnStyle: React.CSSProperties = status === "saved"
    ? { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" }
    : status === "error"
    ? { background: "rgba(192,57,43,0.08)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.20)" }
    : status === "saving"
    ? { background: "rgba(13,61,61,0.05)", color: "#8da8a8", border: "1px solid rgba(13,61,61,0.12)" }
    : { background: "transparent", color: "#4a6060", border: "1px solid rgba(13,61,61,0.15)" };

  return (
    <div
      className="flex items-center justify-between py-3.5"
      style={{ borderBottom: "1px solid rgba(13,61,61,0.07)" }}
    >
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold" style={{ color: "#0f2626" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "#8da8a8" }}>{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          min={min}
          max={max}
          step={step ?? "any"}
          disabled={readOnly || status === "saving"}
          className="w-20 text-right focus:outline-none disabled:opacity-50"
          style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.9)", color: "#0f2626", borderRadius: "10px", padding: "6px 10px", fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}
        />
        <span className="text-[11px] w-10" style={{ color: "#8da8a8" }}>{unit}</span>
        {!readOnly && (
          <button
            onClick={save}
            disabled={status === "saving"}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors min-w-[48px]"
            style={btnStyle}
          >
            {status === "saved" ? "Saved" : status === "error" ? "Error" : status === "saving" ? "…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Settings() {
  const { user }     = useAuth();
  const qc           = useQueryClient();
  const isViewerMode = useViewerMode();
  const canEdit  = !isViewerMode && (user?.role === "org_admin" || user?.role === "supervisor" || user?.role === "super_admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings"],
    queryFn:  () => settingsApi.get(),
    staleTime: 30_000,
  });

  const { mutateAsync: patchSettings } = useMutation({
    mutationFn: (patch: Record<string, number | string>) => settingsApi.update(patch as never),
    onSuccess:  (updated) => { qc.setQueryData(["settings"], updated); },
  });

  const handleSave = useCallback(
    async (key: string, value: number) => { await patchSettings({ [key]: value }); },
    [patchSettings],
  );

  const [notifEmail, setNotifEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const { toast } = useToast();

  if (data && notifEmail === "" && data.notifEmail) setNotifEmail(data.notifEmail);

  async function saveEmail() {
    setEmailStatus("saving");
    try {
      await patchSettings({ notifEmail });
      setEmailStatus("saved");
      toast.success("Email saved", `Alert notifications will be sent to ${notifEmail}.`);
      setTimeout(() => setEmailStatus("idle"), 2000);
    } catch {
      setEmailStatus("error");
      toast.error("Save failed", "Could not update the notification email.");
      setTimeout(() => setEmailStatus("idle"), 3000);
    }
  }

  if (isLoading) return <FullPageSpinner />;
  if (isError || !data) return <ErrorBanner message="Failed to load settings. Please refresh the page." />;

  const s  = data;
  const si = s.systemInfo;

  const thresholdRows = [
    { fieldKey: "surgePosts"           as const, label: "Surge alert threshold",     description: "Alert when posts on a single claim exceed this count in 2 hrs",           value: s.surgePosts,           unit: "posts", min: 50,   max: 1000,  step: 50   },
    { fieldKey: "hitlAutoEscalateAbove" as const, label: "HITL auto-escalate above", description: "Auto-escalate to high priority when confidence exceeds this value",         value: s.hitlAutoEscalateAbove, unit: "%",    min: 50,   max: 100,   step: 1    },
    { fieldKey: "psiDriftAlert"         as const, label: "PSI drift alert",           description: "Trigger retraining recommendation when PSI exceeds this value",             value: s.psiDriftAlert,         unit: "PSI",  min: 0.05, max: 0.5,   step: 0.05 },
    { fieldKey: "overrideRateAlert"     as const, label: "Override rate alert",       description: "Alert when analyst override rate in 24 h exceeds this level",               value: s.overrideRateAlert,     unit: "%",    min: 5,    max: 60,    step: 5    },
  ];

  const modelTargetRows = [
    { fieldKey: "macroF1Target"     as const, label: "Macro-F1 target",       description: "Minimum acceptable macro-F1 before retraining is triggered",   value: s.macroF1Target,    unit: "",      min: 0,   max: 1,      step: 0.01  },
    { fieldKey: "inferenceP95Ms"    as const, label: "Inference P95 target",  description: "Maximum acceptable p95 inference latency",                      value: s.inferenceP95Ms,   unit: "ms",    min: 50,  max: 5000,   step: 50    },
    { fieldKey: "feedbackQueueMax"  as const, label: "Feedback queue max",    description: "Trigger retraining when feedback queue exceeds this count",      value: s.feedbackQueueMax, unit: "items", min: 100, max: 100000, step: 500   },
  ];

  const mlStatusColor = si.mlServiceStatus === "ok" ? "#00897b" : si.mlServiceStatus === "degraded" ? "#d97706" : "#c0392b";

  const emailBtnStyle: React.CSSProperties = emailStatus === "saved"
    ? { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" }
    : emailStatus === "error"
    ? { background: "rgba(192,57,43,0.08)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.20)" }
    : { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,162,97,0.12)" }}>
          <SlidersHorizontal style={{ width: "16px", height: "16px", color: "#F4A261" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>Platform Settings</h1>
          <p className="text-sm" style={{ color: "#4a6060" }}>Alert thresholds, model targets, and system configuration</p>
        </div>
      </div>

      {/* Banners */}
      {si.mockMode && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.18)" }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#d97706" }} />
          <p className="text-xs" style={{ color: "#b45309" }}>
            <strong>Mock mode active</strong> — the ML service is running with stub responses (ML_MOCK_MODE=true). Set ML_MOCK_MODE=false and restart to use the live model.
          </p>
        </div>
      )}
      {!canEdit && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(91,164,207,0.07)", border: "1px solid rgba(91,164,207,0.18)" }}>
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#5BA4CF" }} />
          <p className="text-xs" style={{ color: "#1a6fa0" }}>Settings are read-only for your role. Contact your Organization Admin or Supervisor to make changes.</p>
        </div>
      )}

      {/* Alert thresholds */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c0392b" }} />
          <h2 className="label-caps text-[#4a6060]">Alert Thresholds</h2>
        </div>
        <p className="text-[11px] mb-4 pl-3.5" style={{ color: "#8da8a8" }}>Configure when alerts are triggered. Changes take effect immediately.</p>
        <div>
          {thresholdRows.map((row) => (
            <NumberSetting key={row.fieldKey} {...row} readOnly={!canEdit} onSave={handleSave} />
          ))}
        </div>
      </div>

      {/* Model targets */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00897b" }} />
          <h2 className="label-caps text-[#4a6060]">Model Performance Targets</h2>
        </div>
        <p className="text-[11px] mb-4 pl-3.5" style={{ color: "#8da8a8" }}>Thresholds that trigger retraining recommendations or alerts.</p>
        <div>
          {modelTargetRows.map((row) => (
            <NumberSetting key={row.fieldKey} {...row} readOnly={!canEdit} onSave={handleSave} />
          ))}
        </div>
      </div>

      {/* Notification settings */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#B08BBF" }} />
          <h2 className="label-caps text-[#4a6060]">Notification Settings</h2>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block mb-1.5" style={{ fontSize: "11px", fontWeight: 600, color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Alert notification email
            </label>
            <input
              value={notifEmail}
              onChange={(e) => setNotifEmail(e.target.value)}
              type="email"
              disabled={!canEdit}
              placeholder="alerts@nphcda.gov.ng"
              className="w-full focus:outline-none disabled:opacity-50"
              style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.9)", color: "#0f2626", borderRadius: "12px", padding: "10px 12px", fontSize: "14px" }}
            />
          </div>
          {canEdit && (
            <button
              onClick={saveEmail}
              disabled={emailStatus === "saving"}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0"
              style={emailBtnStyle}
            >
              {emailStatus === "saved" ? <><CheckCircle className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save</>}
            </button>
          )}
        </div>
      </div>

      {/* System info */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-3.5 w-3.5" style={{ color: "#4a6060" }} />
          <h2 className="label-caps text-[#4a6060]">System Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
          {[
            { label: "Region",           value: si.region              },
            { label: "Organisation",     value: si.organisation        },
            { label: "Backend version",  value: si.backendVersion      },
            { label: "Frontend version", value: si.frontendVersion     },
            { label: "ML service URL",   value: si.mlServiceUrl        },
            { label: "ML service",       value: si.mlServiceStatus, dot: mlStatusColor },
            { label: "ML model version", value: si.mlModelVersion      },
            { label: "Mock mode",        value: si.mockMode ? "enabled" : "disabled" },
            { label: "Kafka",            value: si.kafkaEnabled ? "enabled" : "disabled (Phase 2)" },
          ].map(({ label, value, dot }) => (
            <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(13,61,61,0.06)" }}>
              <span className="text-xs" style={{ color: "#4a6060" }}>{label}</span>
              <div className="flex items-center gap-1.5">
                {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
                <span className="text-xs font-semibold text-right truncate max-w-[180px]" style={{ color: "#0f2626", fontFamily: label.includes("version") ? "JetBrains Mono, monospace" : undefined }}>
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
        {s.updatedAt && (
          <p className="text-[10px] mt-4" style={{ color: "#8da8a8" }}>
            Settings last updated: {new Date(s.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
