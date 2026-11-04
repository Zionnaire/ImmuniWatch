import { useQuery } from "@tanstack/react-query";
import { Send, CheckCircle, Clock, BarChart2, ArrowRight } from "lucide-react";
import { dispatchApi } from "../api/dispatch";
import { StatCard } from "../components/StatCard";
import { FullPageSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { formatRelative, PLATFORM_LABELS, LANG_FLAGS } from "../lib/utils";
import type { PostPlatform, PostLanguage } from "../types/api";

const PLATFORM_CHIP: Record<string, { bg: string; color: string }> = {
  bluesky:    { bg: "rgba(91,164,207,0.12)",  color: "#1a6fa0" },
  youtube:    { bg: "rgba(192,57,43,0.10)",   color: "#b03325" },
  twitter:    { bg: "rgba(37,99,235,0.10)",   color: "#1e40af" },
  facebook:   { bg: "rgba(0,137,123,0.10)",   color: "#005048" },
  submission: { bg: "rgba(74,96,96,0.08)",    color: "#4a6060" },
};

const STATUS_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  accepted: { bg: "rgba(0,137,123,0.08)",   color: "#005048", border: "rgba(0,137,123,0.18)"   },
  sent:     { bg: "rgba(37,99,235,0.08)",   color: "#1e40af", border: "rgba(37,99,235,0.18)"   },
  pending:  { bg: "rgba(217,119,6,0.08)",   color: "#b45309", border: "rgba(217,119,6,0.18)"   },
  rejected: { bg: "rgba(192,57,43,0.08)",   color: "#c0392b", border: "rgba(192,57,43,0.18)"   },
};

const PIPELINE_STEPS = [
  { n: "1", icon: "🤖", title: "Classification",  desc: "ML model labels post as misinformation, factual, or irrelevant" },
  { n: "2", icon: "👁",  title: "HITL Review",     desc: "Analyst approves, overrides, or rejects the flagged post" },
  { n: "3", icon: "✍️", title: "Response Gen.",    desc: "Counter-narrative drafted using Knowledge Base context" },
  { n: "4", icon: "📤", title: "Platform Push",    desc: "Response dispatched via platform API or webhook" },
];

export default function ResponseDispatch() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["dispatch", "stats"],
    queryFn: () => dispatchApi.getStats(),
    staleTime: 60_000,
  });

  const { data: dispatches, isLoading: loadingList } = useQuery({
    queryKey: ["dispatch", "list"],
    queryFn: () => dispatchApi.list({ page: 1, limit: 20 }),
  });

  if (isLoading) return <FullPageSpinner />;

  const acceptancePct = stats ? (stats.platformAcceptanceRate * 100).toFixed(1) : "—";
  const maxPlatformCount = Math.max(...(stats?.byPlatform?.map((p) => p.count) ?? [1]), 1);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(176,139,191,0.12)" }}>
          <Send style={{ width: "16px", height: "16px", color: "#B08BBF" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
            Dispatch Monitor
          </h1>
          <p className="text-sm" style={{ color: "#4a6060" }}>
            Counter-narrative delivery pipeline and platform acceptance tracking
          </p>
        </div>
      </div>

      {isError && <ErrorBanner message="Failed to load dispatch data." />}

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Dispatched Today"     value={(stats?.dispatchedToday ?? 0).toLocaleString()} icon={Send}        color="mauve" />
        <StatCard label="Avg Response Time"     value={stats ? `${stats.avgResponseTimeMin}m` : "—"}  icon={Clock}       color="ocean" />
        <StatCard label="Platform Acceptance"   value={`${acceptancePct}%`}                            icon={CheckCircle} color="teal"  />
        <StatCard label="Platforms Active"      value={(stats?.byPlatform?.length ?? 0).toString()}    icon={BarChart2}   color="peach" />
      </div>

      {/* Platform breakdown + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Platform breakdown */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5BA4CF" }} />
            <h2 className="label-caps text-[#4a6060]">Dispatch by Platform</h2>
          </div>
          {stats?.byPlatform?.length ? (
            <div className="space-y-4">
              {stats.byPlatform.map((p) => {
                const label = PLATFORM_LABELS[p.platform as PostPlatform] ?? p.platform;
                const pct   = (p.acceptanceRate * 100).toFixed(0);
                const barW  = Math.round((p.count / maxPlatformCount) * 100);
                const chip  = PLATFORM_CHIP[p.platform] ?? PLATFORM_CHIP.submission;
                return (
                  <div key={p.platform}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                        style={{ background: chip.bg, color: chip.color }}
                      >
                        {label}
                      </span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="tabular-nums" style={{ color: "#4a6060" }}>
                          {p.count.toLocaleString()} sent
                        </span>
                        <span className="font-semibold tabular-nums" style={{ color: "#00897b" }}>
                          {pct}% accepted
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.07)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${barW}%`, background: chip.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No platform data" />
          )}
        </div>

        {/* Pipeline steps */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00897b" }} />
            <h2 className="label-caps text-[#4a6060]">Dispatch Pipeline</h2>
          </div>
          <div className="space-y-0">
            {PIPELINE_STEPS.map((s, i) => (
              <div key={s.n}>
                <div className="flex items-start gap-3 py-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                    style={{ background: "rgba(0,137,123,0.10)", border: "1px solid rgba(0,137,123,0.16)" }}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#0d3d3d", color: "#a7f3d0" }}
                      >
                        {s.n}
                      </span>
                      <p className="text-sm font-semibold" style={{ color: "#0f2626" }}>{s.title}</p>
                    </div>
                    <p className="text-xs mt-0.5 ml-6" style={{ color: "#4a6060" }}>{s.desc}</p>
                  </div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center ml-4 mb-0">
                    <ArrowRight className="h-3 w-3 rotate-90" style={{ color: "rgba(13,61,61,0.20)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent dispatches */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(13,61,61,0.08)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#B08BBF" }} />
          <h2 className="label-caps text-[#4a6060]">Recent Dispatches</h2>
        </div>
        {loadingList ? (
          <div className="p-8"><FullPageSpinner /></div>
        ) : !dispatches?.data?.length ? (
          <div className="p-8">
            <EmptyState title="No dispatches yet" description="Dispatches will appear after HITL approvals." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[560px]">
              <thead>
                <tr>
                  <th>Response Excerpt</th>
                  <th>Platform</th>
                  <th>Lang</th>
                  <th>Status</th>
                  <th>Dispatched</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.data.map((d) => {
                  const chip   = PLATFORM_CHIP[d.platform] ?? PLATFORM_CHIP.submission;
                  const status = STATUS_CHIP[d.status] ?? { bg: "rgba(74,96,96,0.08)", color: "#4a6060", border: "rgba(74,96,96,0.15)" };
                  return (
                    <tr key={d._id}>
                      <td>
                        <p className="line-clamp-2 leading-snug" style={{ color: "#0f2626" }}>{d.response}</p>
                      </td>
                      <td>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: chip.bg, color: chip.color }}>
                          {PLATFORM_LABELS[d.platform as PostPlatform] ?? d.platform}
                        </span>
                      </td>
                      <td>
                        <span title={d.language}>{LANG_FLAGS[d.language as PostLanguage] ?? d.language}</span>
                      </td>
                      <td>
                        <span
                          className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold capitalize"
                          style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ color: "#8da8a8" }}>
                        {formatRelative(d.dispatchedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
