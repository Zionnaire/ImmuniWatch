import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  FileText, AlertTriangle, Clock, Send,
  CheckSquare, BarChart2, Users, ShieldAlert, RefreshCw,
  TrendingUp, Activity, Zap,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { SeverityBadge } from "../components/Badge";
import { LabelBadge } from "../components/Badge";
import { FullPageSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { FallbackModeAlert } from "../components/FallbackModeAlert";
import { RetrainingProgressBanner } from "../components/RetrainingProgressBanner";
import { ErrorBanner } from "../components/ErrorBanner";
import { trendsApi } from "../api/trends";
import { postsApi } from "../api/posts";
import { alertsApi } from "../api/alerts";
import { modelHealthApi } from "../api/modelHealth";
import { hitlApi } from "../api/hitl";
import { dispatchApi } from "../api/dispatch";
import { useAuth } from "../context/AuthContext";
import { formatRelative, LANG_LABELS, PLATFORM_LABELS } from "../lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { Alert, Post, PostLanguage, PostPlatform } from "../types/api";

// ── Mini sparkbar ─────────────────────────────────────────────────────────────
function SparkBar({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const W = 5, G = 2, H = 20;
  const svgW = data.length * W + (data.length - 1) * G;
  return (
    <svg width={svgW} height={H} className="inline-block align-middle">
      {data.map((v, i) => {
        const bh = Math.max(2, Math.round((v / max) * H));
        return (
          <rect
            key={i}
            x={i * (W + G)}
            y={H - bh}
            width={W}
            height={bh}
            fill={v === max && max > 0 ? "#00897b" : "rgba(0,137,123,0.22)"}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

const LANG_ORDER: PostLanguage[] = ["en", "pcm", "ha", "yo", "ig"];

// ── Label colours for the live feed ──────────────────────────────────────────
const LABEL_TICKER: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  misinformation: { bg: "rgba(192,57,43,0.06)", border: "rgba(192,57,43,0.18)", text: "#b03325", dot: "#c0392b" },
  factual:        { bg: "rgba(0,137,123,0.06)", border: "rgba(0,137,123,0.18)", text: "#005048", dot: "#00897b"  },
  irrelevant:     { bg: "rgba(74,96,96,0.05)",  border: "rgba(74,96,96,0.15)",  text: "#4a6060", dot: "#8da8a8"  },
};

const PLATFORM_CHIP: Record<string, { bg: string; color: string }> = {
  bluesky:    { bg: "rgba(91,164,207,0.12)",  color: "#1a6fa0" },
  youtube:    { bg: "rgba(192,57,43,0.10)",   color: "#b03325" },
  twitter:    { bg: "rgba(37,99,235,0.10)",   color: "#1e40af" },
  facebook:   { bg: "rgba(0,137,123,0.10)",   color: "#005048" },
  instagram:  { bg: "rgba(176,139,191,0.14)", color: "#7b4ea0" },
  submission: { bg: "rgba(74,96,96,0.08)",    color: "#4a6060" },
};

// ── Panel header helper ───────────────────────────────────────────────────────
function PanelHeader({
  title, badge, dot, action,
}: {
  title: string;
  badge?: string | number;
  dot?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: dot }}
          />
        )}
        <h2 className="label-caps text-[#4a6060]">{title}</h2>
        {badge !== undefined && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,137,123,0.12)", color: "#00897b" }}
          >
            {badge}
          </span>
        )}
      </div>
      {action && <div className="flex items-center">{action}</div>}
    </div>
  );
}

// ── Alert row (uses severity-* CSS classes) ───────────────────────────────────
function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div className={`severity-${alert.severity} flex items-start gap-3 p-3 rounded-xl text-xs`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug" style={{ color: "#0f2626" }}>
          {alert.title}
        </p>
        <p className="mt-0.5 truncate" style={{ color: "#4a6060" }}>
          {alert.message}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <SeverityBadge severity={alert.severity} />
        <span className="tabular-nums" style={{ color: "#8da8a8" }}>
          {formatRelative(alert.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ── Live Classification Feed ──────────────────────────────────────────────────
const CYCLE_MS = 5000;

function LivePostTicker() {
  const { data, refetch } = useQuery({
    queryKey: ["posts", "ticker"],
    queryFn: () => postsApi.list({ limit: 60, labeled: true }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const posts: Post[] = (data?.data ?? []).filter(
    (p) => p.classification?.label && p.classification.label !== "pending",
  );

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setIdx(0); }, [posts.length]);

  useEffect(() => {
    if (posts.length <= 1) return;
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(100, p + (50 / CYCLE_MS) * 100));
    }, 50);
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % posts.length);
        setProgress(0);
        setVisible(true);
      }, 350);
    }, CYCLE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const post = posts[idx];
  const cls  = post?.classification;
  const label = cls?.label ?? "pending";
  const conf  = cls?.confidence ?? 0;
  const meta  = LABEL_TICKER[label] ?? LABEL_TICKER.irrelevant;
  const platChip = PLATFORM_CHIP[post?.platform ?? ""] ?? PLATFORM_CHIP.submission;

  return (
    <div className="glass-card p-5 flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <PanelHeader
        title="Live Classification Feed"
        dot="#00897b"
        badge={posts.length > 0 ? `${idx + 1}/${posts.length}` : undefined}
        action={
          <button
            onClick={() => { void refetch(); }}
            title="Refresh feed"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#8da8a8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#00897b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8da8a8"; }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* Live pulse */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#00897b" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#00897b" }} />
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "#00897b", fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: "0.05em" }}>
          LIVE
        </span>
      </div>

      {/* Post card */}
      <div className="flex-1 flex flex-col">
        {posts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Waiting for classified posts…" />
          </div>
        ) : post ? (
          <div
            className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)" }}
          >
            {/* Platform + label row */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: platChip.bg, color: platChip.color }}
              >
                {PLATFORM_LABELS[post.platform as PostPlatform] ?? post.platform}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </span>
              <span
                className={`ml-auto text-[11px] font-bold tabular-nums ${
                  conf >= 0.85 ? "text-[#c0392b]" : conf >= 0.7 ? "text-[#d97706]" : "text-[#4a6060]"
                }`}
              >
                {(conf * 100).toFixed(0)}%
              </span>
            </div>

            {/* Content */}
            <blockquote
              className="flex-1 rounded-xl px-4 py-3 text-xs leading-relaxed line-clamp-4"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: "#0f2626" }}
            >
              &ldquo;{post.content}&rdquo;
            </blockquote>

            {/* Meta */}
            <div className="flex items-center justify-between mt-2.5 text-[10px]" style={{ color: "#8da8a8" }}>
              <span>{LANG_LABELS[post.language as PostLanguage] ?? post.language}</span>
              <span className="tabular-nums">{formatRelative(post.ingestedAt ?? post.createdAt)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(0,137,123,0.12)" }}>
        <div
          className="h-full rounded-full transition-none"
          style={{ width: posts.length > 1 ? `${progress}%` : "0%", background: "#00897b" }}
        />
      </div>

      {/* Dot indicators */}
      {posts.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: Math.min(posts.length, 8) }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setVisible(true); setProgress(0); }}
              className="h-1 rounded-full transition-all duration-200"
              style={{
                width: i === idx % 8 ? "12px" : "4px",
                background: i === idx % 8 ? "#00897b" : "rgba(0,137,123,0.18)",
              }}
            />
          ))}
          {posts.length > 8 && (
            <span className="text-[8px] self-center ml-1" style={{ color: "#8da8a8" }}>
              +{posts.length - 8}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Narratives table (shared) ─────────────────────────────────────────────────
function NarrativesPanel({ showTrend = false }: { showTrend?: boolean }) {
  const { data: narratives } = useQuery({
    queryKey: ["trends", "top-narratives"],
    queryFn: () => trendsApi.topNarratives(7, 5),
  });

  return (
    <div className="glass-card p-5">
      <PanelHeader title="Narrative Clusters — 7 days" dot="#B08BBF" />
      {narratives?.length ? (
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="w-6">#</th>
                <th>Claim Cluster</th>
                <th className="text-right w-14">Posts</th>
                {showTrend && <th className="text-right w-16">Trend</th>}
                <th className="text-right w-20">Label</th>
              </tr>
            </thead>
            <tbody>
              {narratives.map(
                (n: { narrative: string; count: number; label: string; trend?: number[] }, i: number) => (
                  <tr key={n.narrative}>
                    <td className="font-bold" style={{ color: "#8da8a8" }}>{i + 1}</td>
                    <td>
                      <p className="line-clamp-1 leading-snug" style={{ color: "#0f2626" }}>
                        {n.narrative}
                      </p>
                    </td>
                    <td className="text-right num-display text-sm font-semibold" style={{ color: "#0f2626" }}>
                      {n.count.toLocaleString()}
                    </td>
                    {showTrend && (
                      <td className="text-right">
                        <SparkBar data={n.trend ?? Array(7).fill(0)} />
                      </td>
                    )}
                    <td className="text-right">
                      <LabelBadge label={n.label as never} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No narratives yet" />
      )}
    </div>
  );
}

// ── Analyst view ──────────────────────────────────────────────────────────────
function AnalystView() {
  const { data: breakdown, isLoading } = useQuery({
    queryKey: ["trends", "classification-breakdown"],
    queryFn: () => trendsApi.classificationBreakdown(1),
  });
  const { data: hitlPending } = useQuery({
    queryKey: ["hitl", "pending-count"],
    queryFn: () => hitlApi.list({ page: 1, limit: 1, status: "pending" }),
    staleTime: 30_000,
  });
  const { data: alertsData } = useQuery({
    queryKey: ["alerts", { resolved: false, severity: "high" }],
    queryFn: () => alertsApi.list({ resolved: false, limit: 5 }),
  });

  const totalToday = breakdown?.reduce((s: number, b: { count: number }) => s + b.count, 0) ?? 0;
  const flaggedToday = breakdown
    ? breakdown.filter((b: { label: string }) => b.label === "misinformation")
        .reduce((s: number, b: { count: number }) => s + b.count, 0)
    : 0;
  const highAlerts = (alertsData?.data ?? []).filter((a: Alert) => a.severity === "high");

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Posts Ingested Today"
          value={totalToday.toLocaleString()}
          icon={FileText}
          color="teal"
          sub="Across all platforms"
        />
        <StatCard
          label="Flagged Today"
          value={flaggedToday.toLocaleString()}
          icon={AlertTriangle}
          color="peach"
          sub="Misinformation detections"
        />
        <StatCard
          label="Awaiting HITL Review"
          value={(hitlPending?.total ?? 0).toLocaleString()}
          icon={Clock}
          color="ocean"
          sub="Pending analyst decisions"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Surveillance focus — high severity alerts */}
        <div className="glass-card p-5 lg:col-span-2">
          <PanelHeader title="Surveillance Focus — High Severity" dot="#c0392b" badge={highAlerts.length || "—"} />
          {highAlerts.length ? (
            <div className="space-y-2">
              {highAlerts.map((alert: Alert) => (
                <AlertRow key={alert._id} alert={alert} />
              ))}
            </div>
          ) : (
            <EmptyState title="No high-severity alerts" description="All surveillance channels clear." />
          )}
        </div>

        {/* Live feed */}
        <LivePostTicker />
      </div>

      {/* Narratives */}
      <NarrativesPanel />
    </div>
  );
}

// ── Senior Analyst view ───────────────────────────────────────────────────────
function SeniorAnalystView() {
  const { data: myStats, isLoading } = useQuery({
    queryKey: ["hitl", "my-stats"],
    queryFn: () => hitlApi.myStats(),
    staleTime: 30_000,
  });
  const { data: dispatchStats } = useQuery({
    queryKey: ["dispatch", "stats"],
    queryFn: () => dispatchApi.getStats(),
    staleTime: 60_000,
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="My Reviews Today"
          value={(myStats?.reviewedToday ?? 0).toString()}
          icon={CheckSquare}
          color="teal"
          sub="Completed decisions"
        />
        <StatCard
          label="My Reviews This Week"
          value={(myStats?.reviewedThisWeek ?? 0).toString()}
          icon={BarChart2}
          color="ocean"
          sub="7-day total"
        />
        <StatCard
          label="My Override Rate"
          value={`${myStats?.overrideRate ?? 0}%`}
          icon={AlertTriangle}
          color="peach"
          sub="Model disagreements"
        />
        <StatCard
          label="Responses Dispatched"
          value={(dispatchStats?.dispatchedToday ?? 0).toLocaleString()}
          icon={Send}
          color="mauve"
          sub="Counter-narratives sent"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Queue breakdown */}
        <div className="glass-card p-5">
          <PanelHeader title="Queue Priority Breakdown" dot="#d97706" />
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.12)" }}>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#c0392b" }} />
                <span style={{ color: "#0f2626" }}>High priority</span>
              </div>
              <span className="num-display text-sm font-bold" style={{ color: "#c0392b" }}>0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(74,96,96,0.05)", border: "1px solid rgba(74,96,96,0.10)" }}>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#8da8a8" }} />
                <span style={{ color: "#0f2626" }}>Standard priority</span>
              </div>
              <span className="num-display text-sm font-bold" style={{ color: "#0f2626" }}>
                {myStats?.pendingTotal ?? 0}
              </span>
            </div>
            <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "rgba(13,61,61,0.08)" }}>
              <span className="font-semibold" style={{ color: "#4a6060" }}>Total pending</span>
              <span className="num-display text-base font-bold" style={{ color: "#0f2626" }}>
                {myStats?.pendingTotal ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Narratives */}
        <div className="lg:col-span-2">
          <NarrativesPanel />
        </div>
      </div>

      {/* Live feed */}
      <LivePostTicker />
    </div>
  );
}

// ── Supervisor view ───────────────────────────────────────────────────────────
function SupervisorView() {
  const { data: teamStats, isLoading } = useQuery({
    queryKey: ["hitl", "team-stats"],
    queryFn: () => hitlApi.teamStats(),
    staleTime: 30_000,
  });
  const { data: alertsData } = useQuery({
    queryKey: ["alerts", { resolved: false }],
    queryFn: () => alertsApi.list({ resolved: false, limit: 5 }),
  });
  const { data: dispatchStats } = useQuery({
    queryKey: ["dispatch", "stats"],
    queryFn: () => dispatchApi.getStats(),
    staleTime: 60_000,
  });

  const recentAlerts: Alert[] = alertsData?.data ?? [];

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Team Reviews Today"
          value={(teamStats?.reviewedToday ?? 0).toString()}
          icon={CheckSquare}
          color="teal"
          sub="Across all analysts"
        />
        <StatCard
          label="Team Override Rate"
          value={`${teamStats?.overrideRate ?? 0}%`}
          icon={AlertTriangle}
          color="peach"
          sub="Model disagreements"
        />
        <StatCard
          label="Active Alerts"
          value={recentAlerts.length.toString()}
          icon={ShieldAlert}
          color="red"
          sub="Requiring attention"
        />
        <StatCard
          label="Responses Dispatched"
          value={(dispatchStats?.dispatchedToday ?? 0).toLocaleString()}
          icon={Send}
          color="mauve"
          sub="Counter-narratives today"
        />
      </div>

      {/* 3-column main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active alerts */}
        <div className="glass-card p-5 lg:col-span-2">
          <PanelHeader title="Active Alert Monitor" dot="#c0392b" badge={recentAlerts.length || "—"} />
          {recentAlerts.length ? (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <AlertRow key={alert._id} alert={alert} />
              ))}
            </div>
          ) : (
            <EmptyState title="No open alerts" description="All clear." />
          )}
        </div>

        {/* Top reviewers + queue */}
        <div className="glass-card p-5 space-y-5">
          <div>
            <PanelHeader title="Top Reviewers Today" dot="#00897b" />
            {teamStats?.topReviewers?.length ? (
              <div className="space-y-2">
                {teamStats.topReviewers.map((r, i) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(0,137,123,0.12)", color: "#00897b" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs" style={{ color: "#0f2626" }}>{r.name}</span>
                    </div>
                    <span className="text-xs font-semibold num-display" style={{ color: "#0f2626" }}>
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "#8da8a8" }}>No reviews recorded today.</p>
            )}
          </div>

          <div className="pt-4" style={{ borderTop: "1px solid rgba(13,61,61,0.08)" }}>
            <PanelHeader title="Pending Queue" />
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#4a6060" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c0392b" }} />
                  High priority
                </span>
                <span className="font-semibold num-display" style={{ color: "#c0392b" }}>
                  {teamStats?.pendingHigh ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5" style={{ color: "#4a6060" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8da8a8" }} />
                  Standard
                </span>
                <span className="font-semibold num-display" style={{ color: "#0f2626" }}>
                  {teamStats?.pendingStandard ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Narratives + live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <NarrativesPanel />
        </div>
        <LivePostTicker />
      </div>
    </div>
  );
}

// ── Super Admin / Org Admin view ──────────────────────────────────────────────
type DailyEntry = {
  day: string;
  date: string;
  misinformation: number;
  factual: number;
  irrelevant: number;
};

function SuperAdminView() {
  const { data: dailyBreakdown, isLoading: loadingBreakdown, isError: breakdownError } = useQuery({
    queryKey: ["trends", "daily-breakdown"],
    queryFn: () => trendsApi.dailyBreakdown(7),
  });
  const { data: narratives, isError: narrativesError } = useQuery({
    queryKey: ["trends", "top-narratives"],
    queryFn: () => trendsApi.topNarratives(7, 5),
  });
  const { data: platformData } = useQuery({
    queryKey: ["trends", "platform-ingestion"],
    queryFn: () => trendsApi.platformIngestion(),
  });
  const { data: langData } = useQuery({
    queryKey: ["trends", "language-distribution"],
    queryFn: () => trendsApi.languageDistribution(),
  });
  const { data: alertsData } = useQuery({
    queryKey: ["alerts", { resolved: false }],
    queryFn: () => alertsApi.list({ resolved: false, limit: 4 }),
  });
  const { data: pipeline } = useQuery({
    queryKey: ["pipeline-status"],
    queryFn: () => modelHealthApi.getPipelineStatus(),
    refetchInterval: 30_000,
  });
  const { data: hitlPending } = useQuery({
    queryKey: ["hitl", "pending-count"],
    queryFn: () => hitlApi.list({ page: 1, limit: 1, status: "pending" }),
    staleTime: 30_000,
  });
  const { data: dispatchStats } = useQuery({
    queryKey: ["dispatch", "stats"],
    queryFn: () => dispatchApi.getStats(),
    staleTime: 60_000,
  });
  const { data: teamStats } = useQuery({
    queryKey: ["hitl", "team-stats"],
    queryFn: () => hitlApi.teamStats(),
    staleTime: 30_000,
  });

  const typedDaily = (dailyBreakdown ?? []) as DailyEntry[];
  const today = typedDaily[typedDaily.length - 1];
  const todayTotal = today ? today.misinformation + today.factual + today.irrelevant : 0;
  const flaggedCount = typedDaily.reduce((s, d) => s + d.misinformation, 0);
  const recentAlerts: Alert[] = alertsData?.data ?? [];

  const platformTotal = platformData?.reduce((s: number, p: { count: number }) => s + p.count, 0) ?? 0;
  const platformRows = (platformData ?? []).slice(0, 5).map((p: { _id: string; count: number }) => ({
    label: PLATFORM_LABELS[p._id as PostPlatform] ?? p._id,
    id: p._id,
    count: p.count,
    pct: platformTotal > 0 ? Math.round((p.count / platformTotal) * 100) : 0,
  }));

  const langTotal = langData?.reduce((s: number, l: { count: number }) => s + l.count, 0) ?? 0;
  const langRows = LANG_ORDER.map((code) => {
    const entry = langData?.find((l: { _id: string }) => l._id === code);
    const count = entry?.count ?? 0;
    return { code, label: LANG_LABELS[code], count, pct: langTotal > 0 ? Math.round((count / langTotal) * 100) : 0 };
  }).filter((r) => r.pct > 0);

  if (loadingBreakdown) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      {(breakdownError || narrativesError) && (
        <ErrorBanner message="Failed to load some dashboard data." />
      )}
      {pipeline?.status === "fallback" && <FallbackModeAlert />}
      {pipeline?.status === "retraining" && pipeline.retrainingStartedAt && (
        <RetrainingProgressBanner startedAt={pipeline.retrainingStartedAt} />
      )}

      {/* Primary KPI strip — 6 tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Posts Today"
          value={todayTotal.toLocaleString()}
          icon={FileText}
          color="teal"
          sub="All platforms"
        />
        <StatCard
          label="Flagged (7d)"
          value={flaggedCount.toLocaleString()}
          icon={AlertTriangle}
          color="peach"
          sub="Misinformation"
        />
        <StatCard
          label="HITL Queue"
          value={(hitlPending?.total ?? 0).toLocaleString()}
          icon={Clock}
          color="ocean"
          sub="Awaiting review"
        />
        <StatCard
          label="Dispatched Today"
          value={(dispatchStats?.dispatchedToday ?? 0).toLocaleString()}
          icon={Send}
          color="mauve"
          sub="Counter-narratives"
        />
        <StatCard
          label="Team Reviews"
          value={(teamStats?.reviewedToday ?? 0).toString()}
          icon={CheckSquare}
          color="teal"
          sub="Analyst completions"
        />
        <StatCard
          label="Override Rate"
          value={`${teamStats?.overrideRate ?? 0}%`}
          icon={Activity}
          color="yellow"
          sub="Model disagreements"
        />
      </div>

      {/* Secondary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="High Priority Pending"
          value={(teamStats?.pendingHigh ?? 0).toString()}
          icon={ShieldAlert}
          color="red"
        />
        <StatCard
          label="Active Reviewers"
          value={(teamStats?.topReviewers?.length ?? 0).toString()}
          icon={Users}
          color="ocean"
        />
        <StatCard
          label="Active Alerts"
          value={recentAlerts.length.toString()}
          icon={Zap}
          color="peach"
        />
        <StatCard
          label="Standard Pending"
          value={(teamStats?.pendingStandard ?? 0).toString()}
          icon={TrendingUp}
          color="mauve"
        />
      </div>

      {/* 7-day chart + Live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass-card p-5 lg:col-span-2">
          <PanelHeader title="7-Day Classification Breakdown" dot="#5BA4CF" />
          {typedDaily.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typedDaily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,61,61,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8da8a8", fontFamily: "Manrope" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#8da8a8", fontFamily: "JetBrains Mono" }}
                  width={42} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid rgba(13,61,61,0.10)", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)" }}
                  formatter={(v: unknown, name: unknown) => [
                    typeof v === "number" ? v.toLocaleString() : String(v),
                    String(name).charAt(0).toUpperCase() + String(name).slice(1),
                  ] as [string, string]}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12, fontFamily: "Plus Jakarta Sans" }} />
                <Bar dataKey="misinformation" stackId="a" fill="#E24B4A" name="Misinformation" />
                <Bar dataKey="irrelevant"     stackId="a" fill="#b0c4c4" name="Irrelevant" />
                <Bar dataKey="factual"        stackId="a" fill="#00897b" name="Factual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No classification data yet" />
          )}
        </div>

        <LivePostTicker />
      </div>

      {/* Narratives + Platform/Language */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Narratives with sparkbars */}
        <div className="glass-card p-5">
          <PanelHeader title="Top Narrative Clusters — 7 days" dot="#B08BBF" />
          {narratives?.length ? (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="w-6">#</th>
                    <th>Claim Cluster</th>
                    <th className="text-right w-14">Posts</th>
                    <th className="text-right w-16">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {narratives.map(
                    (n: { narrative: string; count: number; label: string; trend?: number[] }, i: number) => (
                      <tr key={n.narrative}>
                        <td className="font-bold" style={{ color: "#8da8a8" }}>{i + 1}</td>
                        <td>
                          <p className="line-clamp-1 leading-snug" style={{ color: "#0f2626" }}>
                            {n.narrative}
                          </p>
                        </td>
                        <td className="text-right num-display text-sm font-semibold" style={{ color: "#0f2626" }}>
                          {n.count.toLocaleString()}
                        </td>
                        <td className="text-right">
                          <SparkBar data={n.trend ?? Array(7).fill(0)} />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No narratives yet" />
          )}
        </div>

        {/* Platform + Language intel */}
        <div className="glass-card p-5 space-y-5">
          {/* Platform breakdown */}
          <div>
            <PanelHeader title="Platform Ingestion Today" dot="#5BA4CF" />
            {platformRows.length ? (
              <div className="space-y-2.5">
                {platformRows.map((p) => {
                  const chip = PLATFORM_CHIP[p.id] ?? PLATFORM_CHIP.submission;
                  return (
                    <div key={p.label} className="flex items-center gap-3 text-xs">
                      <span
                        className="w-20 font-medium text-[11px] flex-shrink-0 px-1.5 py-0.5 rounded-md text-center"
                        style={{ background: chip.bg, color: chip.color }}
                      >
                        {p.label}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.07)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.pct}%`, background: chip.color }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums" style={{ color: "#4a6060" }}>{p.pct}%</span>
                      <span className="w-16 text-right tabular-nums font-semibold num-display" style={{ color: "#0f2626" }}>
                        {p.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "#8da8a8" }}>No ingestion data for today.</p>
            )}
          </div>

          {/* Language distribution */}
          <div className="pt-4" style={{ borderTop: "1px solid rgba(13,61,61,0.08)" }}>
            <PanelHeader title="Language Distribution" dot="#00897b" />
            {langRows.length ? (
              <div className="space-y-2">
                {langRows.map((l) => (
                  <div key={l.code} className="flex items-center gap-3 text-xs">
                    <span className="w-14 text-[11px] font-medium" style={{ color: "#4a6060" }}>{l.label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.07)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${l.pct}%`, background: "linear-gradient(90deg, #00897b, #1a5252)" }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums" style={{ color: "#4a6060" }}>{l.pct}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "#8da8a8" }}>No language data for today.</p>
            )}
          </div>
        </div>
      </div>

      {/* Alerts + Top reviewers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <PanelHeader title="Active Alert Monitor" dot="#c0392b" badge={recentAlerts.length || "—"} />
          {recentAlerts.length ? (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <AlertRow key={alert._id} alert={alert} />
              ))}
            </div>
          ) : (
            <EmptyState title="No open alerts" description="All clear." />
          )}
        </div>

        {teamStats?.topReviewers?.length ? (
          <div className="glass-card p-5">
            <PanelHeader title="Top Reviewers Today" dot="#00897b" />
            <div className="space-y-2.5">
              {teamStats.topReviewers.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,137,123,0.12)", color: "#00897b" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: "#0f2626" }}>{r.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="num-display text-sm font-bold" style={{ color: "#0f2626" }}>{r.count}</span>
                    <span className="text-[10px]" style={{ color: "#8da8a8" }}>reviews</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-5 flex items-center justify-center">
            <EmptyState title="No reviewer data" description="Reviews will appear here once analysts have submitted today." />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return <FullPageSpinner />;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,137,123,0.12)" }}
            >
              <Activity style={{ width: "16px", height: "16px", color: "#00897b" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
              Analyst Intelligence Hub
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            Real-time narrative surveillance &amp; misinformation tracking
          </p>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="num-display text-lg font-bold" style={{ color: "#0f2626" }}>{timeStr}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#8da8a8", fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{dateStr}</p>
        </div>
      </div>

      {/* Role-based view */}
      {user.role === "analyst"        && <AnalystView />}
      {user.role === "senior_analyst" && <SeniorAnalystView />}
      {user.role === "supervisor"     && <SupervisorView />}
      {(user.role === "org_admin" || user.role === "super_admin") && <SuperAdminView />}
    </div>
  );
}
