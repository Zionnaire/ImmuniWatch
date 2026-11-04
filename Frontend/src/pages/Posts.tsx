import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Loader2, CheckCircle, Clock, ShieldAlert, Eye, Radio,
} from "lucide-react";
import { postsApi } from "../api/posts";
import { hitlApi } from "../api/hitl";
import { LabelBadge } from "../components/Badge";
import { FullPageSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { useToast } from "../context/ToastContext";
import { useViewerMode } from "../context/ViewerModeContext";
import { formatRelative, LANG_FLAGS, LANG_LABELS, PLATFORM_LABELS } from "../lib/utils";
import type { Post, PostLanguage, PostPlatform } from "../types/api";

const PAGE_SIZE = 60;

// Confidence bar colors per label
const CONF_BAR: Record<string, string> = {
  misinformation: "#c0392b",
  factual:        "#00897b",
  irrelevant:     "#8da8a8",
  pending:        "#5BA4CF",
};

// Platform chip styles
const PLATFORM_CHIP: Record<string, { bg: string; color: string }> = {
  bluesky:    { bg: "rgba(91,164,207,0.12)",  color: "#1a6fa0" },
  youtube:    { bg: "rgba(192,57,43,0.10)",   color: "#b03325" },
  twitter:    { bg: "rgba(37,99,235,0.10)",   color: "#1e40af" },
  facebook:   { bg: "rgba(0,137,123,0.10)",   color: "#005048" },
  instagram:  { bg: "rgba(176,139,191,0.14)", color: "#7b4ea0" },
  submission: { bg: "rgba(74,96,96,0.08)",    color: "#4a6060" },
};

// ── Action semantics ──────────────────────────────────────────────────────────
type ActionType = "queue" | "escalate" | "review";

function resolveAction(post: Post): ActionType | null {
  const label = post.classification?.label;
  const conf  = post.classification?.confidence ?? 0;
  if (!label || label === "pending") return null;
  if (label === "misinformation") return conf >= 0.85 ? "escalate" : "queue";
  if (label === "factual" || label === "irrelevant") return "review";
  return null;
}

// ── HITL status badge ─────────────────────────────────────────────────────────
function HitlBadge({ post }: { post: Post }) {
  const h = post.hitlReview;
  if (!h) return null;

  const MAP: Record<string, { label: string; bg: string; color: string; border: string; Icon: typeof CheckCircle }> = {
    pending:    { label: "In queue",  bg: "rgba(37,99,235,0.08)",   color: "#1e40af", border: "rgba(37,99,235,0.18)",   Icon: Clock },
    approved:   { label: "Approved",  bg: "rgba(0,137,123,0.08)",   color: "#005048", border: "rgba(0,137,123,0.18)",   Icon: CheckCircle },
    rejected:   { label: "Rejected",  bg: "rgba(192,57,43,0.08)",   color: "#c0392b", border: "rgba(192,57,43,0.18)",   Icon: ShieldAlert },
    overridden: { label: "Overridden",bg: "rgba(217,119,6,0.08)",   color: "#b45309", border: "rgba(217,119,6,0.18)",   Icon: Eye },
  };
  const m = MAP[h.status];
  if (!m) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
    >
      <m.Icon className="h-3 w-3" />
      {m.label}
      {h.priority === "high" && h.status === "pending" && (
        <span className="ml-0.5 font-bold text-[#c0392b]">!</span>
      )}
    </span>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionButton({ post }: { post: Post }) {
  const qc           = useQueryClient();
  const toast        = useToast().toast;
  const isViewerMode = useViewerMode();

  const { mutate: doQueue, isPending } = useMutation({
    mutationFn: (priority: "standard" | "high") => hitlApi.queuePost(post._id, priority),
    onSuccess: (_data, priority) => {
      void qc.invalidateQueries({ queryKey: ["posts"] });
      void qc.invalidateQueries({ queryKey: ["hitl"] });
      toast.success(
        priority === "high" ? "Post escalated" : "Post queued",
        priority === "high"
          ? "Added to HITL queue as high-priority."
          : "Added to HITL queue for analyst review.",
      );
    },
    onError: () => toast.error("Action failed", "Could not add post to review queue."),
  });

  if (post.hitlReview) return <HitlBadge post={post} />;
  if (isViewerMode) return null;

  const action = resolveAction(post);
  if (!action) return null;

  const CONFIGS: Record<ActionType, { label: string; style: React.CSSProperties; onClick: () => void }> = {
    escalate: {
      label: "Escalate",
      style: { background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", color: "#c0392b" },
      onClick: () => doQueue("high"),
    },
    queue: {
      label: "Queue",
      style: { background: "rgba(0,137,123,0.08)", border: "1px solid rgba(0,137,123,0.22)", color: "#005048" },
      onClick: () => doQueue("standard"),
    },
    review: {
      label: "Review",
      style: { background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#b45309" },
      onClick: () => doQueue("standard"),
    },
  };

  const cfg = CONFIGS[action];
  return (
    <button
      onClick={cfg.onClick}
      disabled={isPending}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
      style={cfg.style}
    >
      {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      {cfg.label}
    </button>
  );
}

// ── Select helper ──────────────────────────────────────────────────────────────
function FilterSelect({
  value, onChange, children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-xs rounded-xl focus:outline-none"
      style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.85)", color: "#0f2626", minWidth: "130px" }}
    >
      {children}
    </select>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Posts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [platform, setPlatform] = useState("");
  const [language, setLanguage] = useState("");
  const [labeled, setLabeled] = useState("");

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["posts", { page, search, platform, language, labeled }],
    queryFn: () =>
      postsApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        platform: (platform as PostPlatform) || undefined,
        language: (language as PostLanguage) || undefined,
        labeled: labeled === "" ? undefined : labeled === "true",
      }),
    placeholderData: (prev) => prev,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const posts: Post[] = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(91,164,207,0.12)" }}>
              <Radio style={{ width: "16px", height: "16px", color: "#5BA4CF" }} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
                Live Post Feed
              </h1>
              {/* Live pulse */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#00897b" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#00897b" }} />
              </span>
            </div>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            Real-time social media ingestion — {total.toLocaleString()} posts indexed
          </p>
        </div>
        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#8da8a8" }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing…
          </div>
        )}
      </div>

      {isError && <ErrorBanner message="Failed to load posts. Please try again." />}

      {/* Filter bar */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#8da8a8" }} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search posts…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.85)", color: "#0f2626" }}
            />
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>

          <div className="w-px self-stretch" style={{ background: "rgba(13,61,61,0.08)" }} />

          <FilterSelect value={platform} onChange={(v) => { setPlatform(v); setPage(1); }}>
            <option value="">All platforms</option>
            {(Object.entries(PLATFORM_LABELS) as [PostPlatform, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </FilterSelect>

          <FilterSelect value={language} onChange={(v) => { setLanguage(v); setPage(1); }}>
            <option value="">All languages</option>
            {(Object.entries(LANG_FLAGS) as [PostLanguage, string][]).map(([k]) => (
              <option key={k} value={k}>{LANG_FLAGS[k]} {LANG_LABELS[k]}</option>
            ))}
          </FilterSelect>

          <FilterSelect value={labeled} onChange={(v) => { setLabeled(v); setPage(1); }}>
            <option value="">All posts</option>
            <option value="true">Classified</option>
            <option value="false">Pending classification</option>
          </FilterSelect>
        </form>
      </div>

      {/* Feed */}
      {isLoading ? (
        <FullPageSpinner />
      ) : posts.length === 0 ? (
        <div className="glass-card p-8">
          <EmptyState title="No posts found" description="Try adjusting your filters." />
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const conf  = post.classification?.confidence ?? 0;
            const label = post.classification?.label;
            const confBarColor = label ? (CONF_BAR[label] ?? "#8da8a8") : "#8da8a8";
            const platChip = PLATFORM_CHIP[post.platform] ?? PLATFORM_CHIP.submission;
            const isMisinfo = label === "misinformation";

            return (
              <div
                key={post._id}
                className={`glass-card px-4 py-3.5 transition-all duration-150 ${post.archivedAt ? "opacity-50" : ""}`}
                style={isMisinfo ? { borderLeft: "3px solid rgba(192,57,43,0.50)" } : undefined}
              >
                <div className="flex gap-4">
                  {/* Left: content */}
                  <div className="flex-1 min-w-0">
                    {/* Top meta row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* Platform chip */}
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                        style={{ background: platChip.bg, color: platChip.color }}
                      >
                        {PLATFORM_LABELS[post.platform as PostPlatform] ?? post.platform}
                      </span>

                      {/* Language */}
                      <span className="text-[11px]" title={LANG_LABELS[post.language as PostLanguage] ?? post.language}>
                        {LANG_FLAGS[post.language as PostLanguage] ?? post.language}
                      </span>

                      {/* Author */}
                      {post.authorHandle && (
                        <span className="text-[11px]" style={{ color: "#8da8a8" }}>
                          @{post.authorHandle}
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="ml-auto text-[10px] tabular-nums" style={{ color: "#8da8a8" }}>
                        {formatRelative(post.ingestedAt ?? post.createdAt)}
                      </span>
                    </div>

                    {/* Post content */}
                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "#0f2626" }}>
                      {post.content}
                    </p>
                  </div>

                  {/* Right: classification + action */}
                  <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0 min-w-[120px]">
                    {/* Label */}
                    <div className="flex flex-col items-end gap-1.5">
                      {label ? (
                        <LabelBadge label={label} />
                      ) : (
                        <span className="text-[11px]" style={{ color: "#8da8a8" }}>Pending</span>
                      )}

                      {/* Confidence */}
                      {conf > 0 && (
                        <div className="w-20">
                          <div className="flex justify-end mb-0.5">
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: confBarColor }}>
                              {(conf * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.08)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${conf * 100}%`, background: confBarColor }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <ActionButton post={post} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="glass-card px-4 py-3 flex items-center justify-between">
          <span className="text-xs" style={{ color: "#8da8a8" }}>
            Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {total.toLocaleString()} posts · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="px-3 py-1.5 text-xs rounded-xl transition-colors disabled:opacity-40"
              style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="px-3 py-1.5 text-xs rounded-xl transition-colors disabled:opacity-40"
              style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
