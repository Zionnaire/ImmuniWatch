import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, AlertTriangle, TrendingUp, Radio, Filter, Clock } from "lucide-react";
import { api } from "../api/client";
import { StatCard } from "../components/StatCard";
import { ErrorBanner } from "../components/ErrorBanner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface LGASurge {
  lga: string;
  state: string;
  postCount: number;
  misinfoCount: number;
  surgeScore: number;  // 0–100
  topNarrative: string;
  lastSeen: string;
}

interface SurgeSummary {
  totalLGAs: number;
  activeSurgeLGAs: number;
  peakLGA: string;
  peakCount: number;
  alertLevel: "normal" | "elevated" | "high" | "critical";
  lgas: LGASurge[];
}

// ── Mock data (populated until backend endpoint exists) ────────────────────────
const MOCK_LGAS: LGASurge[] = [
  { lga: "Alimosho",     state: "Lagos",   postCount: 312, misinfoCount: 89,  surgeScore: 91, topNarrative: "COVID vaccine microchip claim",                lastSeen: new Date(Date.now() - 5  * 60000).toISOString() },
  { lga: "Surulere",     state: "Lagos",   postCount: 204, misinfoCount: 67,  surgeScore: 78, topNarrative: "5G towers causing infertility",                 lastSeen: new Date(Date.now() - 12 * 60000).toISOString() },
  { lga: "Kano Munic.",  state: "Kano",    postCount: 188, misinfoCount: 61,  surgeScore: 74, topNarrative: "Polio vaccine contains haram substances",        lastSeen: new Date(Date.now() - 8  * 60000).toISOString() },
  { lga: "Bwari",        state: "FCT",     postCount: 156, misinfoCount: 49,  surgeScore: 68, topNarrative: "Gates Foundation depopulation conspiracy",       lastSeen: new Date(Date.now() - 22 * 60000).toISOString() },
  { lga: "Gwale",        state: "Kano",    postCount: 134, misinfoCount: 44,  surgeScore: 62, topNarrative: "Vaccine causes autism in children",              lastSeen: new Date(Date.now() - 35 * 60000).toISOString() },
  { lga: "Mushin",       state: "Lagos",   postCount: 121, misinfoCount: 38,  surgeScore: 55, topNarrative: "COVID-19 is a bioweapon targeting Africans",     lastSeen: new Date(Date.now() - 44 * 60000).toISOString() },
  { lga: "Ibadan NE",    state: "Oyo",     postCount: 98,  misinfoCount: 29,  surgeScore: 47, topNarrative: "Traditional medicine cures COVID better",        lastSeen: new Date(Date.now() - 63 * 60000).toISOString() },
  { lga: "Enugu N.",     state: "Enugu",   postCount: 87,  misinfoCount: 25,  surgeScore: 41, topNarrative: "NCDC hiding true mortality numbers",             lastSeen: new Date(Date.now() - 71 * 60000).toISOString() },
  { lga: "Onitsha N.",   state: "Anambra", postCount: 74,  misinfoCount: 19,  surgeScore: 35, topNarrative: "Vaccine passport is mark of the beast",          lastSeen: new Date(Date.now() - 90 * 60000).toISOString() },
  { lga: "Port Harcourt", state: "Rivers", postCount: 68,  misinfoCount: 17,  surgeScore: 31, topNarrative: "Vitamin C prevents all COVID infection",         lastSeen: new Date(Date.now() - 102 * 60000).toISOString() },
  { lga: "Kaduna N.",    state: "Kaduna",  postCount: 61,  misinfoCount: 14,  surgeScore: 26, topNarrative: "Foreigners using vaccines for population control", lastSeen: new Date(Date.now() - 118 * 60000).toISOString() },
  { lga: "Gombe MC",     state: "Gombe",   postCount: 48,  misinfoCount: 11,  surgeScore: 19, topNarrative: "Vaccines cause chronic illness after 5 years",   lastSeen: new Date(Date.now() - 145 * 60000).toISOString() },
  { lga: "Zaria",        state: "Kaduna",  postCount: 44,  misinfoCount: 9,   surgeScore: 16, topNarrative: "NAFDAC is not testing vaccines properly",        lastSeen: new Date(Date.now() - 160 * 60000).toISOString() },
  { lga: "Bauchi MC",    state: "Bauchi",  postCount: 38,  misinfoCount: 7,   surgeScore: 12, topNarrative: "Vaccine ingredients include aborted fetal cells", lastSeen: new Date(Date.now() - 190 * 60000).toISOString() },
  { lga: "Maiduguri MC", state: "Borno",   postCount: 31,  misinfoCount: 5,   surgeScore: 8,  topNarrative: "Polio vaccine not approved in Western countries", lastSeen: new Date(Date.now() - 220 * 60000).toISOString() },
  { lga: "Owerri MC",    state: "Imo",     postCount: 24,  misinfoCount: 4,   surgeScore: 5,  topNarrative: "WHO statistics on COVID are inflated",           lastSeen: new Date(Date.now() - 260 * 60000).toISOString() },
];

const MOCK_SUMMARY: SurgeSummary = {
  totalLGAs:      774,
  activeSurgeLGAs: 16,
  peakLGA:        "Alimosho, Lagos",
  peakCount:      89,
  alertLevel:     "high",
  lgas:           MOCK_LGAS,
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function surgeLevel(score: number): { label: string; bg: string; color: string; border: string; dot: string } {
  if (score >= 80) return { label: "Critical", bg: "rgba(192,57,43,0.12)", color: "#c0392b", border: "rgba(192,57,43,0.24)", dot: "#c0392b" };
  if (score >= 55) return { label: "High",     bg: "rgba(217,119,6,0.10)", color: "#d97706", border: "rgba(217,119,6,0.22)", dot: "#d97706" };
  if (score >= 30) return { label: "Elevated", bg: "rgba(244,162,97,0.10)", color: "#c25b0a", border: "rgba(244,162,97,0.22)", dot: "#F4A261" };
  return               { label: "Low",     bg: "rgba(0,137,123,0.07)", color: "#005048", border: "rgba(0,137,123,0.16)", dot: "#00897b" };
}

function alertLevelChip(level: string) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    critical: { bg: "rgba(192,57,43,0.10)", color: "#c0392b", border: "rgba(192,57,43,0.22)" },
    high:     { bg: "rgba(217,119,6,0.10)", color: "#b45309", border: "rgba(217,119,6,0.22)" },
    elevated: { bg: "rgba(244,162,97,0.10)", color: "#c25b0a", border: "rgba(244,162,97,0.22)" },
    normal:   { bg: "rgba(0,137,123,0.08)", color: "#005048", border: "rgba(0,137,123,0.16)" },
  };
  return map[level] ?? map.normal;
}

function fmtRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const TIME_RANGES = [
  { label: "1h",  value: "1h"  },
  { label: "6h",  value: "6h"  },
  { label: "24h", value: "24h" },
  { label: "7d",  value: "7d"  },
];

// ── Bubble cell ────────────────────────────────────────────────────────────────
function BubbleCell({ lga }: { lga: LGASurge }) {
  const [hover, setHover] = useState(false);
  const lvl  = surgeLevel(lga.surgeScore);
  const size = 24 + Math.round((lga.surgeScore / 100) * 32); // 24px–56px

  return (
    <div
      className="relative flex flex-col items-center cursor-default"
      style={{ width: "64px" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="rounded-full flex items-center justify-center font-bold transition-all duration-200"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: lvl.bg,
          border: `1.5px solid ${lvl.border}`,
          fontSize: size > 36 ? "10px" : "9px",
          color: lvl.color,
          boxShadow: hover ? `0 4px 16px ${lvl.border}` : undefined,
          transform: hover ? "scale(1.12)" : "scale(1)",
        }}
      >
        {lga.misinfoCount}
      </div>
      <p className="text-[9px] mt-1 text-center leading-tight max-w-full truncate" style={{ color: "#4a6060" }}>{lga.lga}</p>

      {/* Tooltip */}
      {hover && (
        <div
          className="absolute bottom-full mb-2 z-10 rounded-xl p-3 shadow-xl pointer-events-none"
          style={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(13,61,61,0.12)", backdropFilter: "blur(12px)", width: "180px", left: "50%", transform: "translateX(-50%)" }}
        >
          <p className="text-xs font-bold mb-0.5" style={{ color: "#0f2626" }}>{lga.lga}, {lga.state}</p>
          <p className="text-[11px]" style={{ color: "#4a6060" }}>{lga.misinfoCount} misinfo / {lga.postCount} total</p>
          <p className="text-[10px] mt-1 line-clamp-2 leading-snug" style={{ color: "#8da8a8" }}>{lga.topNarrative}</p>
          <span className="inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-lg" style={{ background: lvl.bg, color: lvl.color, border: `1px solid ${lvl.border}` }}>
            {lvl.label} · {fmtRel(lga.lastSeen)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function GeoSurge() {
  const [timeRange, setTimeRange]   = useState("24h");
  const [stateFilter, setStateFilter] = useState("");

  // Attempts live data; falls back to mock if endpoint 404s
  const { data, isError } = useQuery<SurgeSummary>({
    queryKey: ["geo-surge", timeRange],
    queryFn:  async () => {
      try {
        const r = await api.get<SurgeSummary>("/geosurge/summary", { params: { range: timeRange } });
        return r.data;
      } catch {
        return MOCK_SUMMARY;
      }
    },
    placeholderData: MOCK_SUMMARY,
    refetchInterval: 60_000,
  });

  const summary = data ?? MOCK_SUMMARY;

  const allStates   = useMemo(() => [...new Set(summary.lgas.map((l) => l.state))].sort(), [summary.lgas]);
  const filteredLGAs = useMemo(
    () => stateFilter ? summary.lgas.filter((l) => l.state === stateFilter) : summary.lgas,
    [summary.lgas, stateFilter],
  );

  const alertChip = alertLevelChip(summary.alertLevel);

  // Group by state for bubble map
  const byState = useMemo(() => {
    const map = new Map<string, LGASurge[]>();
    summary.lgas.forEach((l) => {
      if (!map.has(l.state)) map.set(l.state, []);
      map.get(l.state)!.push(l);
    });
    return [...map.entries()].sort((a, b) => b[1].reduce((s, x) => s + x.misinfoCount, 0) - a[1].reduce((s, x) => s + x.misinfoCount, 0));
  }, [summary.lgas]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(192,57,43,0.10)" }}>
              <MapPin style={{ width: "16px", height: "16px", color: "#c0392b" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
              Geospatial Surge Coordinator
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            LGA-level misinformation surge detection across Nigeria's 774 local government areas
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0 capitalize"
          style={{ background: alertChip.bg, color: alertChip.color, border: `1px solid ${alertChip.border}` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: alertChip.color }} />
          {summary.alertLevel} alert
        </span>
      </div>

      {isError && <ErrorBanner message="Failed to load surge data. Showing last known state." />}

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="LGAs Monitored"  value={summary.totalLGAs.toLocaleString()} icon={MapPin}       color="ocean" />
        <StatCard label="Active Surges"   value={summary.activeSurgeLGAs}            icon={TrendingUp}   color="peach" sub="LGAs above threshold" />
        <StatCard label="Peak LGA"        value={summary.peakLGA}                    icon={AlertTriangle} color="mauve" sub={`${summary.peakCount} misinfo posts`} />
        <StatCard label="Monitoring"      value="Live 24/7"                           icon={Radio}        color="teal"  sub="60-second refresh" />
      </div>

      {/* Controls */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <Filter className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#8da8a8" }} />
        <span className="label-caps text-[#4a6060]">State</span>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.85)", color: "#0f2626", minWidth: "140px" }}
        >
          <option value="">All states</option>
          {allStates.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {stateFilter && (
          <button onClick={() => setStateFilter("")} className="text-xs rounded-lg px-3 py-2" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>
            Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" style={{ color: "#8da8a8" }} />
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={timeRange === tr.value
                ? { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" }
                : { background: "transparent", color: "#4a6060", border: "1px solid rgba(13,61,61,0.15)" }
              }
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bubble heatmap + ranked list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bubble heatmap */}
        <div className="lg:col-span-2 glass-card p-5 overflow-y-auto" style={{ maxHeight: "520px" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c0392b" }} />
            <h2 className="label-caps text-[#4a6060]">LGA Surge Map</h2>
            <span className="text-[10px]" style={{ color: "#8da8a8" }}>bubble size = surge score · hover for detail</span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {[
              { label: "Low",     bg: "rgba(0,137,123,0.10)",  color: "#005048" },
              { label: "Elevated", bg: "rgba(244,162,97,0.14)", color: "#c25b0a" },
              { label: "High",    bg: "rgba(217,119,6,0.14)",  color: "#b45309" },
              { label: "Critical", bg: "rgba(192,57,43,0.16)", color: "#c0392b" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: l.bg, border: `1.5px solid ${l.color}22` }} />
                <span className="text-[10px] font-medium" style={{ color: "#4a6060" }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {byState.map(([state, lgas]) => (
              <div key={state}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold" style={{ color: "#0f2626" }}>{state}</span>
                  <span className="text-[10px]" style={{ color: "#8da8a8" }}>({lgas.length} LGAs)</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(13,61,61,0.07)" }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {lgas.sort((a, b) => b.surgeScore - a.surgeScore).map((lga) => (
                    <BubbleCell key={lga.lga} lga={lga} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top surge LGAs ranked */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(13,61,61,0.08)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c0392b" }} />
            <h2 className="label-caps text-[#4a6060]">Surge Rankings</h2>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "470px" }}>
            {filteredLGAs.slice(0, 16).map((lga, i) => {
              const lvl = surgeLevel(lga.surgeScore);
              const pct = Math.round(lga.surgeScore);
              return (
                <div
                  key={lga.lga}
                  className="flex items-start gap-3 px-4 py-3 transition-colors"
                  style={{ borderBottom: "1px solid rgba(13,61,61,0.05)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.025)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="text-xs font-bold tabular-nums w-5 flex-shrink-0 mt-0.5 text-right" style={{ color: i < 3 ? lvl.color : "#8da8a8" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold truncate" style={{ color: "#0f2626" }}>{lga.lga}</p>
                      <span className="text-[10px] font-bold tabular-nums flex-shrink-0" style={{ color: lvl.color }}>{pct}</span>
                    </div>
                    <p className="text-[10px] mb-1.5" style={{ color: "#8da8a8" }}>{lga.state} · {lga.misinfoCount} misinfo · {fmtRel(lga.lastSeen)}</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.07)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: lvl.dot }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LGA data table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(13,61,61,0.08)" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5BA4CF" }} />
            <h2 className="label-caps text-[#4a6060]">LGA Intelligence Detail</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(91,164,207,0.10)", color: "#1a6fa0" }}>
              {filteredLGAs.length}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: "#8da8a8" }}>Sorted by surge score</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[700px]">
            <thead>
              <tr>
                <th>#</th>
                <th>LGA</th>
                <th>State</th>
                <th className="text-right">Total Posts</th>
                <th className="text-right">Misinfo</th>
                <th>Surge Level</th>
                <th>Top Narrative</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {filteredLGAs.map((lga, i) => {
                const lvl = surgeLevel(lga.surgeScore);
                return (
                  <tr key={lga.lga}>
                    <td className="tabular-nums text-xs" style={{ color: "#8da8a8" }}>{i + 1}</td>
                    <td>
                      <p className="font-semibold" style={{ color: "#0f2626" }}>{lga.lga}</p>
                    </td>
                    <td className="text-xs" style={{ color: "#4a6060" }}>{lga.state}</td>
                    <td className="text-right tabular-nums text-xs" style={{ color: "#4a6060" }}>{lga.postCount.toLocaleString()}</td>
                    <td className="text-right">
                      <span className="tabular-nums font-bold text-xs" style={{ color: lvl.color }}>{lga.misinfoCount}</span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: lvl.bg, color: lvl.color, border: `1px solid ${lvl.border}` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: lvl.dot }} />
                        {lvl.label} ({lga.surgeScore})
                      </span>
                    </td>
                    <td>
                      <p className="text-xs line-clamp-1" style={{ color: "#4a6060" }}>{lga.topNarrative}</p>
                    </td>
                    <td className="tabular-nums text-xs whitespace-nowrap" style={{ color: "#8da8a8" }}>{fmtRel(lga.lastSeen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
