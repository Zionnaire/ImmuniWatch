import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, TrendingUp, AlertCircle, Activity, Zap, Brain } from "lucide-react";
import { modelHealthApi } from "../api/modelHealth";
import { ModelStatusBadge } from "../components/ModelStatusBadge";
import { FallbackModeAlert } from "../components/FallbackModeAlert";
import { RetrainingProgressBanner } from "../components/RetrainingProgressBanner";
import { StatCard } from "../components/StatCard";
import { FullPageSpinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { useViewerMode } from "../context/ViewerModeContext";
import { formatPct, formatDateTime, LANG_FLAGS } from "../lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { PostLanguage } from "../types/api";

const LANG_COLORS: Record<string, string> = {
  en: "#00897b", pcm: "#5BA4CF", ha: "#F4A261", yo: "#B08BBF", ig: "#d97706",
};

const TOOLTIP_STYLE = {
  fontSize: 11, borderRadius: 12,
  border: "1px solid rgba(13,61,61,0.10)",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(8px)",
};

export default function ModelHealth() {
  const qc           = useQueryClient();
  const isViewerMode = useViewerMode();

  const { data: metrics, isLoading, isError: metricsError } = useQuery({
    queryKey: ["model-health", "metrics"],
    queryFn: () => modelHealthApi.getMetrics(),
    refetchInterval: 60_000,
  });

  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-status"],
    queryFn: () => modelHealthApi.getPipelineStatus(),
    refetchInterval: 30_000,
  });

  const { data: trend } = useQuery({
    queryKey: ["model-health", "f1-trend"],
    queryFn: () => modelHealthApi.getF1Trend(),
  });

  const { data: retrainStatus } = useQuery({
    queryKey: ["model-health", "retrain-status"],
    queryFn: () => modelHealthApi.getRetrainStatus(),
    refetchInterval: 30_000,
  });

  const [retrainError, setRetrainError] = useState("");
  const { mutate: triggerRetrain, isPending: triggering } = useMutation({
    mutationFn: () => modelHealthApi.triggerRetrain(),
    onSuccess: () => {
      setRetrainError("");
      void qc.invalidateQueries({ queryKey: ["pipeline-status"] });
      void qc.invalidateQueries({ queryKey: ["model-health", "retrain-status"] });
    },
    onError: () => setRetrainError("Failed to trigger retrain. Please try again."),
  });

  if (isLoading) return <FullPageSpinner />;

  const perLang = metrics?.perLanguage
    ? (Object.entries(metrics.perLanguage) as [PostLanguage, { macroF1: number; recall: number; psi: number }][])
    : [];

  const isMock = pipeline?.mockMode === true || pipeline?.status === "mock";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,137,123,0.12)" }}>
              <Brain style={{ width: "16px", height: "16px", color: "#00897b" }} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
                Model Health &amp; Training Hub
              </h1>
              {isMock && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.12)", color: "#b45309", border: "1px solid rgba(217,119,6,0.20)" }}>
                  MOCK MODE
                </span>
              )}
            </div>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            ML model performance, F1 trend, per-language metrics, and retraining controls
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {pipeline && <ModelStatusBadge status={pipeline.status} />}
          {!isViewerMode && (
            <button
              onClick={() => triggerRetrain()}
              disabled={triggering || pipeline?.status === "retraining"}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${triggering ? "animate-spin" : ""}`} />
              Trigger Retrain
            </button>
          )}
        </div>
      </div>

      {/* Stale data warning */}
      {metrics?.stale && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.18)" }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#d97706" }} />
          <p className="text-xs" style={{ color: "#b45309" }}>
            <strong>Showing cached data</strong> — the ML service was unreachable at last refresh. Metrics may be outdated.
            {metrics.computedAt && <span className="ml-1">Last computed: {formatDateTime(metrics.computedAt)}.</span>}
          </p>
        </div>
      )}

      {metricsError && <ErrorBanner message="Failed to load model metrics." />}
      {retrainError && <ErrorBanner message={retrainError} />}

      {pipeline?.status === "fallback" && <FallbackModeAlert />}
      {pipeline?.status === "retraining" && retrainStatus?.startedAt && (
        <RetrainingProgressBanner startedAt={retrainStatus.startedAt} runId={retrainStatus.runId} />
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Macro F1"
          value={metrics ? formatPct(metrics.macroF1) : "—"}
          icon={TrendingUp}
          color="teal"
          sub={metrics?.computedAt ? `Computed ${formatDateTime(metrics.computedAt)}` : metrics?.lastRetrain ? `Retrained ${formatDateTime(metrics.lastRetrain)}` : undefined}
        />
        <StatCard label="Recall"       value={metrics ? formatPct(metrics.recall)    : "—"} color="ocean" icon={Activity} sub="Overall" />
        <StatCard label="Precision"    value={metrics ? formatPct(metrics.precision)  : "—"} color="mauve" icon={Zap} />
        <StatCard label="Inference P95" value={metrics ? `${metrics.inferenceP95ms}ms` : "—"} color="peach" icon={Zap} sub="Latency" />
      </div>

      {/* F1 trend + per-language */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* F1 trend chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00897b" }} />
            <h2 className="label-caps text-[#4a6060]">F1 Score Trend — 30 Days</h2>
          </div>
          {trend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,61,61,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8da8a8", fontFamily: "Plus Jakarta Sans" }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: "#8da8a8", fontFamily: "JetBrains Mono" }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => typeof v === "number" ? `${(v * 100).toFixed(1)}%` : ""}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="macroF1" stroke="#00897b" dot={false} strokeWidth={2} name="Macro F1" activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: "#8da8a8" }}>No trend data yet.</p>
            </div>
          )}
        </div>

        {/* Per-language metrics */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5BA4CF" }} />
            <h2 className="label-caps text-[#4a6060]">Per-Language Metrics</h2>
          </div>
          {perLang.length ? (
            <div className="space-y-4">
              {perLang.map(([lang, vals]) => (
                <div key={lang}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{LANG_FLAGS[lang] ?? ""}</span>
                      <span className="text-xs font-semibold" style={{ color: "#0f2626" }}>{lang.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="tabular-nums" style={{ color: "#4a6060" }}>F1 <strong>{formatPct(vals.macroF1)}</strong></span>
                      {"recall" in vals && (
                        <span className="tabular-nums" style={{ color: "#4a6060" }}>
                          Recall <strong>{formatPct((vals as typeof vals & { recall: number }).recall)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.07)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${vals.macroF1 * 100}%`, background: LANG_COLORS[lang] ?? "#00897b" }}
                    />
                  </div>
                  {vals.psi > 0.2 && (
                    <p className="text-[11px] mt-1" style={{ color: "#d97706" }}>
                      ⚠ PSI drift: {vals.psi.toFixed(3)} — above threshold
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm" style={{ color: "#8da8a8" }}>No per-language data.</p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback queue */}
      {metrics?.feedbackQueue !== undefined && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F4A261" }} />
                <h2 className="label-caps text-[#4a6060]">Feedback Queue</h2>
              </div>
              <p className="num-display text-4xl font-bold mt-2" style={{ color: "#0f2626" }}>
                {metrics.feedbackQueue.toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: "#4a6060" }}>
                Posts pending feedback incorporation into next retrain
              </p>
            </div>
            {metrics.feedbackQueue > 100 && (
              <div className="p-3 rounded-xl" style={{ background: "rgba(244,162,97,0.10)", border: "1px solid rgba(244,162,97,0.20)" }}>
                <AlertCircle className="h-5 w-5" style={{ color: "#c25b0a" }} />
                <p className="text-[11px] mt-1 max-w-[120px] text-center" style={{ color: "#c25b0a" }}>Consider triggering retrain</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
