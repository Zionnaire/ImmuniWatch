import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, AlertTriangle, Globe, Layers } from "lucide-react";
import { trendsApi } from "../api/trends";
import { StatCard } from "../components/StatCard";
import { LabelBadge } from "../components/Badge";
import { FullPageSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { LANG_LABELS } from "../lib/utils";
import type { PostLanguage } from "../types/api";

const LANG_COLORS: Record<string, string> = {
  en:  "#00897b",
  pcm: "#5BA4CF",
  ha:  "#F4A261",
  yo:  "#B08BBF",
  ig:  "#d97706",
};

const LANG_ORDER: PostLanguage[] = ["en", "pcm", "ha", "yo", "ig"];

const TOOLTIP_STYLE = {
  fontSize: 11, borderRadius: 12,
  border: "1px solid rgba(13,61,61,0.10)",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(8px)",
};

export default function TrendAnalysis() {
  const { data: daily, isLoading, isError } = useQuery({
    queryKey: ["trends", "daily-misinformation"],
    queryFn: () => trendsApi.dailyMisinformation(30),
  });

  const { data: breakdown } = useQuery({
    queryKey: ["trends", "classification-breakdown"],
    queryFn: () => trendsApi.classificationBreakdown(7),
  });

  const { data: narratives } = useQuery({
    queryKey: ["trends", "top-narratives"],
    queryFn: () => trendsApi.topNarratives(7, 8),
  });

  const { data: langData } = useQuery({
    queryKey: ["trends", "language-distribution"],
    queryFn: () => trendsApi.languageDistribution(),
  });

  const totalPosts = breakdown?.reduce((s: number, b: { count: number }) => s + b.count, 0) ?? 0;
  const flagged = breakdown
    ? breakdown.filter((b: { label: string }) => b.label === "misinformation").reduce((s: number, b: { count: number }) => s + b.count, 0)
    : 0;
  const flagRate = totalPosts > 0 ? ((flagged / totalPosts) * 100).toFixed(1) : "0.0";

  const peakDay = daily?.reduce(
    (max: { count: number; date: string } | null, d: { count: number; date: string }) => (!max || d.count > max.count ? d : max),
    null,
  );

  const langTotal = langData?.reduce((s: number, l: { count: number }) => s + l.count, 0) ?? 0;
  const langRows = LANG_ORDER.map((code) => {
    const entry = langData?.find((l: { _id: string }) => l._id === code);
    const count = entry?.count ?? 0;
    return { code, label: LANG_LABELS[code], count, pct: langTotal > 0 ? Math.round((count / langTotal) * 100) : 0 };
  }).filter((r) => r.pct > 0);

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,162,97,0.12)" }}>
              <TrendingUp style={{ width: "16px", height: "16px", color: "#F4A261" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
              Intelligence Trend Monitor
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            30-day misinformation volume, narrative clusters, and language breakdown
          </p>
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: "#8da8a8" }}>Last 30 days</span>
      </div>

      {isError && <ErrorBanner message="Failed to load trend data." />}

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Posts Analysed (7d)" value={totalPosts.toLocaleString()} icon={Layers}        color="teal"  />
        <StatCard label="Flagged (7d)"         value={flagged.toLocaleString()}     icon={AlertTriangle} color="peach" />
        <StatCard label="Flag Rate (7d)"        value={`${flagRate}%`}               icon={TrendingUp}    color="mauve" />
        <StatCard label="Languages Tracked"     value={langRows.length.toString()}   icon={Globe}         color="ocean" />
      </div>

      {/* 30-day area chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c0392b" }} />
            <h2 className="label-caps text-[#4a6060]">Misinformation Volume — 30 Days</h2>
          </div>
          {peakDay && peakDay.count > 0 && (
            <p className="text-[11px]" style={{ color: "#8da8a8" }}>
              Peak: <strong style={{ color: "#0f2626" }}>{peakDay.count.toLocaleString()}</strong> posts on{" "}
              {(() => { const [yr, m, dd] = peakDay.date.split("-"); return `${parseInt(dd)}/${parseInt(m)}/${yr}`; })()}
            </p>
          )}
        </div>
        {daily?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={daily.map((d: { date: string; count: number }, i: number) => ({ ...d, day: i + 1 }))}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="misGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#E24B4A" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,61,61,0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "#8da8a8", fontFamily: "JetBrains Mono" }}
                tickFormatter={(v: number) => `D${v}`}
                interval={2}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8da8a8", fontFamily: "JetBrains Mono" }}
                width={42}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString() : String(v), "Flagged posts"] as [string, string]}
                labelFormatter={(day: number) => {
                  const entry = daily[day - 1];
                  if (!entry) return `Day ${day}`;
                  const [yr, m, dd] = entry.date.split("-");
                  return `${parseInt(dd)}/${parseInt(m)}/${yr}`;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#E24B4A"
                strokeWidth={2}
                fill="url(#misGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#E24B4A", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No trend data" description="Data will appear as posts are classified." />
        )}
      </div>

      {/* Language chart + Narratives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Language distribution */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5BA4CF" }} />
            <h2 className="label-caps text-[#4a6060]">Post Volume by Language</h2>
          </div>
          {langRows.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={langRows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,61,61,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8da8a8", fontFamily: "Plus Jakarta Sans" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8da8a8" }} width={28} unit="%" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => [typeof v === "number" ? `${v}%` : "", "Share"] as [string, string]}
                />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  {langRows.map((row) => (
                    <Cell key={row.code} fill={LANG_COLORS[row.code] ?? "#8da8a8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No language data" />
          )}
        </div>

        {/* Narrative clusters */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#B08BBF" }} />
            <h2 className="label-caps text-[#4a6060]">Emerging Narrative Clusters — 7 Days</h2>
          </div>
          {narratives?.length ? (
            <div className="space-y-2">
              {narratives.map(
                (n: { narrative: string; count: number; label: string }, i: number) => (
                  <div
                    key={n.narrative}
                    className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: "rgba(13,61,61,0.03)", border: "1px solid rgba(13,61,61,0.06)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.06)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.03)"; }}
                  >
                    <span
                      className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(176,139,191,0.15)", color: "#7b4ea0" }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug line-clamp-2" style={{ color: "#0f2626" }}>
                        {n.narrative}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <LabelBadge label={n.label as never} />
                        <span className="text-[10px] tabular-nums" style={{ color: "#8da8a8" }}>
                          {n.count.toLocaleString()} posts
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyState title="No narratives yet" />
          )}
        </div>
      </div>
    </div>
  );
}
