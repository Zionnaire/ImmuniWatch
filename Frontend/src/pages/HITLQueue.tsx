import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useViewerMode } from "../context/ViewerModeContext";
import {
  Check, X, Edit3, Copy, CheckCheck, Loader2, Send, SkipForward,
  Brain, BookOpen, MessageSquare, ChevronRight, ShieldAlert,
  Clock, AlertTriangle,
} from "lucide-react";
import { hitlApi } from "../api/hitl";
import { api } from "../api/client";
import { LabelBadge, PriorityBadge, StatusBadge } from "../components/Badge";
import { FullPageSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { ErrorBanner } from "../components/ErrorBanner";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { dispatchApi } from "../api/dispatch";
import { formatRelative, LANG_LABELS, PLATFORM_LABELS, LABEL_META } from "../lib/utils";
import type {
  HITLReview, ClassificationLabel, HITLPriority, PostLanguage, PostPlatform, HITLStatus,
} from "../types/api";

const PAGE_SIZE = 20;

function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg ?? fallback;
}

// ── Override modal ─────────────────────────────────────────────────────────────
function OverrideModal({ review, onClose }: { review: HITLReview; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [label, setLabel] = useState<ClassificationLabel>(
    (review.classificationId as { label: ClassificationLabel }).label ?? "irrelevant",
  );
  const [response, setResponse] = useState("");
  const [note, setNote] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => hitlApi.override(review._id, { overrideLabel: label, editedResponse: response, reviewerNote: note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hitl"] });
      toast.success("Override submitted", `Label corrected to "${label}"`);
      onClose();
    },
    onError: (err) => {
      toast.error("Override failed", apiMessage(err, "Could not submit the override. Please try again."));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Override Label
        </label>
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value as ClassificationLabel)}
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
          style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.9)", color: "#0f2626" }}
        >
          {(Object.keys(LABEL_META) as ClassificationLabel[]).map((l) => (
            <option key={l} value={l}>{LABEL_META[l].label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Corrected Response <span style={{ color: "#8da8a8", textTransform: "none", letterSpacing: "0" }}>(optional)</span>
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={3}
          placeholder="Enter corrected public response…"
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
          style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.9)", color: "#0f2626" }}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Reviewer Note <span style={{ color: "#8da8a8", textTransform: "none", letterSpacing: "0" }}>(optional)</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for override…"
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{ border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.9)", color: "#0f2626" }}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-xl transition-colors disabled:opacity-50"
          style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}
        >
          Cancel
        </button>
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit Override
        </button>
      </div>
    </div>
  );
}

// ── Dispatch modal ─────────────────────────────────────────────────────────────
type CNVersion = "short" | "medium" | "long";

function DispatchModal({ review, onClose }: { review: HITLReview; onClose: () => void }) {
  const toast = useToast().toast;

  const post = review.postId as { _id?: string; platform?: PostPlatform } | null;
  const cls  = review.classificationId as {
    label?: string; confidence?: number;
    kbEvidence?: Array<{ title: string; snippet: string; score: number }>;
  } | null;

  const postId = post?._id ?? (typeof review.postId === "string" ? review.postId : "");
  const platformLabel = post?.platform ? (PLATFORM_LABELS[post.platform] ?? post.platform) : "platform";
  const kbSeed = cls?.kbEvidence?.[0]?.snippet ?? cls?.kbEvidence?.[0]?.title ?? "";

  const [text, setText] = useState(review.approvedResponse ?? "");
  const [version, setVersion] = useState<CNVersion>("short");
  const [copied, setCopied] = useState(false);
  const [mlAvailable, setMlAvailable] = useState(false);
  const [cnSource, setCnSource] = useState<"ml" | "groq" | "template" | null>(null);
  const [cnVersions, setCnVersions] = useState<Record<CNVersion, string>>({ short: "", medium: "", long: "" });
  const [done, setDone] = useState(false);
  const [deployedSuccessfully, setDeployedSuccessfully] = useState(false);
  const [deployedPlatform, setDeployedPlatform] = useState<string | null>(null);
  const platform = post?.platform ?? null;

  const { data: cnData, isLoading: cnLoading } = useQuery({
    queryKey: ["counter-narrative", postId],
    queryFn: () => dispatchApi.getCounterNarrative(postId),
    enabled: !!postId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!cnData) return;
    if (cnData.available) {
      const versions = { short: cnData.short ?? cnData.counterNarrative ?? "", medium: cnData.medium ?? cnData.counterNarrative ?? "", long: cnData.long ?? cnData.counterNarrative ?? "" };
      setCnVersions(versions);
      setText(versions.short || versions.medium || versions.long);
      setMlAvailable(true);
      setCnSource(cnData.source ?? null);
    } else if (!text && kbSeed) {
      setText(kbSeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnData]);

  function switchVersion(v: CNVersion) {
    setVersion(v);
    if (cnVersions[v]) setText(cnVersions[v]);
  }

  const { mutate: deploy, isPending: deploying } = useMutation({
    mutationFn: () => dispatchApi.deployCounterNarrative(postId, text),
    onSuccess: (data) => {
      // Use backend's confirmed platform — more reliable than component-level variable
      // since review.postId may not always be populated when the modal opens.
      const confirmedPlatform = data.platform ?? platform;
      setDeployedPlatform(confirmedPlatform);
      setDeployedSuccessfully(true);
      setDone(true);
      if (confirmedPlatform === "twitter") {
        toast.success("Posted to Twitter/X", "Counter-narrative posted as a reply to the original tweet.");
      } else {
        toast.success("Response saved", `Counter-narrative recorded. Copy and post to ${platformLabel}.`);
      }
    },
    onError: () => {
      toast.warning("Saved locally", "Response saved in your records. Copy and post it manually.");
      setDeployedSuccessfully(false);
      setDone(true);
    },
  });

  const { mutate: skip, isPending: skipping } = useMutation({
    mutationFn: () => dispatchApi.skipCounterNarrative(postId),
    onSuccess: () => { toast.info("Skipped", "No counter-narrative will be sent."); onClose(); },
    onError:   () => { toast.info("Skipped", "Marked as reviewed."); onClose(); },
  });

  async function copyToClipboard() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* browser may block */ }
  }

  if (done) {
    const postedDirectly = deployedSuccessfully && deployedPlatform === "twitter";
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{
            background: postedDirectly ? "rgba(0,137,123,0.10)" : "rgba(244,162,97,0.10)",
            border: `1px solid ${postedDirectly ? "rgba(0,137,123,0.22)" : "rgba(244,162,97,0.28)"}`,
          }}>
          <CheckCheck className="h-4 w-4 flex-shrink-0" style={{ color: postedDirectly ? "#00897b" : "#c97b2a" }} />
          <p className="text-sm" style={{ color: postedDirectly ? "#005048" : "#7a4a10" }}>
            {postedDirectly
              ? <>Counter-narrative <strong>posted to Twitter/X</strong> as a reply to the original tweet.</>
              : <>Response saved. Copy and post it manually on <strong>{platformLabel}</strong>.</>}
          </p>
        </div>
        {text && (
          <textarea readOnly value={text} rows={4} className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
            style={{ border: "1px solid rgba(13,61,61,0.12)", background: "rgba(13,61,61,0.03)", color: "#0f2626" }} />
        )}
        <div className="flex justify-end gap-2">
          {text && (
            <button onClick={() => { void copyToClipboard(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl font-medium transition-colors ${copied ? "text-white" : ""}`}
              style={{ background: copied ? "#0d3d3d" : "transparent", border: copied ? "1px solid #0d3d3d" : "1px solid rgba(13,61,61,0.20)", color: copied ? "#fff" : "#4a6060" }}
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button onClick={onClose} className="btn-primary px-4 py-2 text-sm">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs flex-1" style={{ color: "#4a6060" }}>
          Edit the counter-narrative below, then <strong>Deploy</strong> to record it, or <strong>Skip</strong> if no reply is needed.
        </p>
        {cnLoading && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "#8da8a8" }}>
            <Loader2 className="h-3 w-3 animate-spin" /> Generating…
          </span>
        )}
        {mlAvailable && !cnLoading && (
          <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-lg"
            style={{ background: cnSource === "groq" ? "rgba(109,40,217,0.08)" : cnSource === "template" ? "rgba(74,96,96,0.08)" : "rgba(0,137,123,0.10)", color: cnSource === "groq" ? "#6d28d9" : cnSource === "template" ? "#4a6060" : "#005048", border: cnSource === "groq" ? "1px solid rgba(109,40,217,0.18)" : "1px solid rgba(0,137,123,0.18)" }}>
            {cnSource === "ml" ? "ML generated" : cnSource === "groq" ? "AI generated (Groq)" : "Template — edit before sending"}
          </span>
        )}
      </div>

      {mlAvailable && (cnVersions.medium || cnVersions.long) && (
        <div className="flex gap-1.5">
          {(["short", "medium", "long"] as CNVersion[]).map((v) => (
            <button key={v} onClick={() => switchVersion(v)} disabled={!cnVersions[v]}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors disabled:opacity-30"
              style={version === v ? { background: "#0d3d3d", color: "#fff", borderColor: "#0d3d3d" } : { borderColor: "rgba(13,61,61,0.20)", color: "#4a6060", background: "transparent" }}>
              {v === "short" ? "Short ≤280" : v === "medium" ? "Medium" : "Long"}
            </button>
          ))}
          <span className="text-[10px] self-center ml-1" style={{ color: "#8da8a8" }}>Select length then edit</span>
        </div>
      )}

      {cls?.kbEvidence && cls.kbEvidence.length > 0 && (
        <div className="rounded-xl px-3 py-2.5 flex gap-2 text-xs" style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.16)" }}>
          <span className="font-semibold flex-shrink-0" style={{ color: "#00897b" }}>KB:</span>
          <span className="line-clamp-2" style={{ color: "#005048" }}>{cls.kbEvidence[0].snippet || cls.kbEvidence[0].title}</span>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Counter-narrative <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "0", color: "#8da8a8" }}>(editable)</span>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={cnLoading ? "Generating counter-narrative from ML service…" : "Draft your counter-narrative here…"}
          disabled={cnLoading}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none"
          style={{ border: "1px solid rgba(13,61,61,0.15)", background: cnLoading ? "rgba(13,61,61,0.03)" : "rgba(255,255,255,0.9)", color: "#0f2626" }}
        />
        <p className="text-[11px] mt-1" style={{ color: "#8da8a8" }}>{text.length} characters</p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <button onClick={() => skip()} disabled={skipping || deploying}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl transition-colors disabled:opacity-50"
          style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>
          {skipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
          Skip
        </button>
        <div className="flex gap-2">
          <button onClick={() => { void copyToClipboard(); }} disabled={!text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl font-medium transition-colors disabled:opacity-40"
            style={copied ? { background: "#0d3d3d", color: "#fff" } : { border: "1px solid rgba(13,61,61,0.18)", color: "#4a6060" }}>
            {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={() => deploy()} disabled={!text.trim() || deploying || skipping}
            className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-sm">
            {deploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Deploy to {platformLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Similar-post context strip ─────────────────────────────────────────────────
function ContextStrip({ postId }: { postId: string }) {
  const { data } = useQuery({
    queryKey: ["posts", "similar-count", postId],
    queryFn: () => api.get<{ label: string; count: number; platforms: Array<{ platform: string; count: number }> }>("/posts/similar-count", { params: { postId } }).then((r) => r.data),
    staleTime: 60_000,
  });

  if (!data || data.count === 0) return null;
  const topPlatforms = data.platforms.slice(0, 3).map((p) => `${PLATFORM_LABELS[p.platform as PostPlatform] ?? p.platform} (${p.count})`).join(" · ");

  return (
    <div className="flex items-center gap-2 text-[11px] rounded-xl px-3 py-2 mb-3" style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.18)", color: "#b45309" }}>
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>
        <strong>{data.count.toLocaleString()}</strong> similar {data.label} posts in the last 24 h — {topPlatforms || "multiple platforms"}
      </span>
    </div>
  );
}

// ── Queue card (compact master list item) ─────────────────────────────────────
const PLATFORM_CHIP: Record<string, { bg: string; color: string }> = {
  bluesky:    { bg: "rgba(91,164,207,0.12)",  color: "#1a6fa0" },
  youtube:    { bg: "rgba(192,57,43,0.10)",   color: "#b03325" },
  twitter:    { bg: "rgba(37,99,235,0.10)",   color: "#1e40af" },
  facebook:   { bg: "rgba(0,137,123,0.10)",   color: "#005048" },
  submission: { bg: "rgba(74,96,96,0.08)",    color: "#4a6060" },
};

function QueueCard({
  review, isSelected, onSelect,
}: {
  review: HITLReview;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const cls  = review.classificationId as { label: ClassificationLabel; confidence: number } | null;
  const post = review.postId as { content: string; platform: PostPlatform } | null;
  const conf = cls?.confidence ?? 0;
  const chip = PLATFORM_CHIP[post?.platform ?? ""] ?? PLATFORM_CHIP.submission;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150 group flex items-start gap-3"
      style={{
        background: isSelected ? "rgba(13,61,61,0.07)" : "transparent",
        border: isSelected ? "1px solid rgba(13,61,61,0.15)" : "1px solid transparent",
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.04)"; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Priority dot */}
      <div className="flex-shrink-0 mt-1">
        <span
          className="w-2 h-2 rounded-full block"
          style={{ background: review.priority === "high" ? "#c0392b" : "#8da8a8" }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {cls && <LabelBadge label={cls.label} />}
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: chip.bg, color: chip.color }}>
            {PLATFORM_LABELS[post?.platform as PostPlatform] ?? post?.platform ?? ""}
          </span>
          {conf > 0 && (
            <span
              className="ml-auto text-[10px] font-bold tabular-nums"
              style={{ color: conf >= 0.85 ? "#c0392b" : conf >= 0.7 ? "#d97706" : "#4a6060" }}
            >
              {(conf * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Content preview */}
        {post && (
          <p className="text-[11px] line-clamp-2 leading-snug" style={{ color: "#0f2626" }}>
            {post.content}
          </p>
        )}

        {/* Time */}
        <p className="text-[10px] mt-1.5 tabular-nums" style={{ color: "#8da8a8" }}>
          {formatRelative(review.createdAt)}
        </p>
      </div>

      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-1 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: "#4a6060" }} />
    </button>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────────
function DetailPanel({
  review,
  canOverride,
  actingIds,
  onApprove,
  onReject,
  onOverride,
}: {
  review: HITLReview;
  canOverride: boolean;
  actingIds: Set<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onOverride: (r: HITLReview) => void;
}) {
  const isViewerMode = useViewerMode();
  const cls  = review.classificationId as {
    label: ClassificationLabel; confidence: number; suggestedResponse?: string;
    kbEvidence?: Array<{ title: string; summary?: string; snippet?: string; score?: number }>;
  } | null;
  const post = review.postId as { _id?: string; content: string; platform: PostPlatform; language: PostLanguage } | null;
  const conf = cls?.confidence ?? 0;
  const kbEvidence = cls?.kbEvidence ?? [];
  const isActing = actingIds.has(review._id);
  const postId = post?._id ?? (typeof review.postId === "string" ? review.postId : "");

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5">
      {/* Signal header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {cls && <LabelBadge label={cls.label} />}
          <PriorityBadge priority={review.priority} />
          {post && (
            <span className="text-xs" style={{ color: "#8da8a8" }}>
              {PLATFORM_LABELS[post.platform] ?? post.platform} · {LANG_LABELS[post.language] ?? post.language} · {formatRelative(review.createdAt)}
            </span>
          )}
        </div>
      </div>

      {/* Model confidence panel */}
      {conf > 0 && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(13,61,61,0.04)", border: "1px solid rgba(13,61,61,0.08)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4" style={{ color: "#00897b" }} />
            <span className="label-caps text-[#4a6060]">Model Signal Confidence</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="num-display text-3xl font-bold" style={{ color: conf >= 0.85 ? "#c0392b" : conf >= 0.7 ? "#d97706" : "#0f2626" }}>
              {(conf * 100).toFixed(0)}%
            </span>
            <div className="flex-1 pb-1.5">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(13,61,61,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${conf * 100}%`, background: conf >= 0.85 ? "#c0392b" : conf >= 0.7 ? "#d97706" : "#00897b" }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#8da8a8" }}>
                {conf >= 0.85 ? "High confidence — flag warrants urgent review" : conf >= 0.7 ? "Moderate confidence — verify before action" : "Low confidence — manual verification required"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post content */}
      {post && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-3.5 w-3.5" style={{ color: "#4a6060" }} />
            <span className="label-caps text-[#4a6060]">Original Post Content</span>
          </div>
          <blockquote
            className="rounded-xl px-4 py-3 text-sm leading-relaxed"
            style={{ background: "rgba(13,61,61,0.04)", border: "1px solid rgba(13,61,61,0.08)", color: "#0f2626", fontStyle: "normal" }}
          >
            &ldquo;{post.content}&rdquo;
          </blockquote>
        </div>
      )}

      {/* Similar-post surge warning */}
      {postId && cls?.label === "misinformation" && (
        <ContextStrip postId={postId} />
      )}

      {/* KB evidence panel */}
      {kbEvidence.length > 0 ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3.5 w-3.5" style={{ color: "#00897b" }} />
            <span className="label-caps text-[#4a6060]">Knowledge Base Evidence</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,137,123,0.12)", color: "#00897b" }}>
              {kbEvidence.length}
            </span>
          </div>
          <div className="space-y-2">
            {kbEvidence.map((ev, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5 text-xs" style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.14)" }}>
                <p className="font-semibold mb-0.5" style={{ color: "#005048" }}>{ev.title}</p>
                {(ev.summary ?? ev.snippet) && (
                  <p className="line-clamp-2 leading-relaxed" style={{ color: "#4a6060" }}>
                    {ev.summary ?? ev.snippet}
                  </p>
                )}
                {ev.score !== undefined && (
                  <p className="mt-1 tabular-nums" style={{ color: "#8da8a8" }}>Relevance: {(ev.score * 100).toFixed(0)}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : cls?.label === "misinformation" ? (
        <div className="mb-4 rounded-xl px-3 py-2.5 text-xs flex gap-2" style={{ background: "rgba(0,137,123,0.05)", border: "1px solid rgba(0,137,123,0.12)" }}>
          <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#00897b" }} />
          <span style={{ color: "#4a6060" }}>No KB evidence found — enrich the Knowledge Base to improve auto-responses.</span>
        </div>
      ) : null}

      {/* Proposed response */}
      {cls?.suggestedResponse && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-3.5 w-3.5" style={{ color: "#B08BBF" }} />
            <span className="label-caps text-[#4a6060]">Proposed Counter-Response</span>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(176,139,191,0.07)", border: "1px solid rgba(176,139,191,0.18)", color: "#0f2626" }}>
            {cls.suggestedResponse}
          </div>
        </div>
      )}

      {review.reviewerNote && (
        <p className="text-xs italic mb-4" style={{ color: "#4a6060" }}>Note: {review.reviewerNote}</p>
      )}

      {/* Action buttons — hidden in viewer mode */}
      {!isViewerMode && (
        <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(13,61,61,0.08)" }}>
          {review.status === "pending" ? (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { if (!isActing) onApprove(review._id); }}
                disabled={isActing}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Approve (A)"
              >
                {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </button>
              {canOverride && (
                <button
                  onClick={() => { if (!isActing) onOverride(review); }}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#b45309" }}
                  title="Override label (O)"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Override
                </button>
              )}
              <button
                onClick={() => { if (!isActing) onReject(review._id); }}
                disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}
                title="Reject (R)"
              >
                {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Reject
              </button>
            </div>
          ) : (
            <StatusBadge status={review.status} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty detail placeholder ───────────────────────────────────────────────────
function DetailPlaceholder({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: "rgba(0,137,123,0.08)" }}>
        <ShieldAlert className="h-7 w-7" style={{ color: "#00897b" }} />
      </div>
      <p className="font-semibold text-center" style={{ color: "#0f2626" }}>Select a signal to review</p>
      <p className="text-xs text-center max-w-[180px]" style={{ color: "#8da8a8" }}>
        {total > 0 ? `${total} signal${total !== 1 ? "s" : ""} pending review — choose one from the queue` : "No pending signals in this queue"}
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HITLQueue() {
  const qc           = useQueryClient();
  const toast        = useToast().toast;
  const { user }     = useAuth();
  const isViewerMode = useViewerMode();

  const canOverride =
    !isViewerMode && (
      user?.role === "senior_analyst" || user?.role === "supervisor" ||
      user?.role === "org_admin"      || user?.role === "super_admin"
    );

  const [page, setPage] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState<HITLPriority | "all">("all");
  const [overrideTarget, setOverrideTarget] = useState<HITLReview | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<HITLReview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());
  const reviewsRef = useRef<HITLReview[]>([]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["hitl", { page, priority: priorityFilter }],
    queryFn: () => hitlApi.list({
      page, limit: PAGE_SIZE, status: "pending" as HITLStatus,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
      sortBy: "createdAt", sortOrder: "desc",
    }),
    placeholderData: (prev) => prev,
  });

  function startAction(id: string) { setActingIds((s) => new Set(s).add(id)); }
  function endAction(id: string)   { setActingIds((s) => { const n = new Set(s); n.delete(id); return n; }); }

  const { mutate: approve } = useMutation({
    mutationFn: (id: string) => hitlApi.approve(id),
    onMutate:  (id) => startAction(id),
    onSuccess: (approved, id) => {
      endAction(id);
      void qc.invalidateQueries({ queryKey: ["hitl"] });
      toast.success("Review approved", "The post has been marked for dispatch.");
      setDispatchTarget(approved);
      setSelectedId(null);
    },
    onError: (err, id) => {
      endAction(id);
      toast.error("Approve failed", apiMessage(err, "Could not approve the review. Please try again."));
    },
  });

  const { mutate: reject } = useMutation({
    mutationFn: (id: string) => hitlApi.reject(id),
    onMutate:  (id) => startAction(id),
    onSuccess: (_data, id) => {
      endAction(id);
      void qc.invalidateQueries({ queryKey: ["hitl"] });
      toast.success("Review rejected", "Post removed from the queue.");
      if (selectedId === id) setSelectedId(null);
    },
    onError: (err, id) => {
      endAction(id);
      toast.error("Reject failed", apiMessage(err, "Could not reject the review. Please try again."));
    },
  });

  const reviews: HITLReview[] = data?.data ?? [];
  useEffect(() => { reviewsRef.current = reviews; });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const selected = reviews.find((r) => r._id === selectedId) ?? null;

  // Auto-select first on load
  useEffect(() => {
    if (!selectedId && reviews.length > 0) setSelectedId(reviews[0]._id);
  }, [reviews.length]); // eslint-disable-line

  // ── Keyboard shortcuts (disabled in viewer mode) ────────────────────────────
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (isViewerMode) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const id = selectedId ?? reviewsRef.current[0]?._id;
      if (!id) return;
      if ((e.key === "a" || e.key === "A") && !actingIds.has(id)) { e.preventDefault(); approve(id); }
      if ((e.key === "r" || e.key === "R") && !actingIds.has(id)) { e.preventDefault(); reject(id); }
      if ((e.key === "o" || e.key === "O") && canOverride) {
        e.preventDefault();
        const target = reviewsRef.current.find((rv) => rv._id === id);
        if (target) setOverrideTarget(target);
      }
    },
    [isViewerMode, selectedId, actingIds, approve, reject, canOverride],
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const TABS: { key: HITLPriority | "all"; label: string }[] = [
    { key: "all",      label: `All (${total})` },
    { key: "high",     label: "High priority" },
    { key: "standard", label: "Standard" },
  ];

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,137,123,0.12)" }}>
              <ShieldAlert style={{ width: "16px", height: "16px", color: "#00897b" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
              Signal Review Queue
            </h1>
            {total > 0 && (
              <span className="text-sm font-semibold px-2.5 py-1 rounded-xl" style={{ background: "rgba(192,57,43,0.10)", color: "#c0392b" }}>
                {total}
              </span>
            )}
          </div>
          <p className="text-sm pl-10 hidden sm:block" style={{ color: "#4a6060" }}>
            Human-in-the-loop classification review &amp; counter-narrative dispatch
          </p>
        </div>

        {/* Keyboard hints */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0 text-[11px]" style={{ color: "#8da8a8" }}>
          <Clock className="h-3.5 w-3.5" />
          <span>
            <kbd className="px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: "rgba(13,61,61,0.08)", border: "1px solid rgba(13,61,61,0.12)", color: "#4a6060" }}>A</kbd>
            {" "}approve{" · "}
            <kbd className="px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: "rgba(13,61,61,0.08)", border: "1px solid rgba(13,61,61,0.12)", color: "#4a6060" }}>R</kbd>
            {" "}reject
            {canOverride && <>
              {" · "}
              <kbd className="px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: "rgba(13,61,61,0.08)", border: "1px solid rgba(13,61,61,0.12)", color: "#4a6060" }}>O</kbd>
              {" "}override
            </>}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setPriorityFilter(key); setPage(1); setSelectedId(null); }}
            className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
            style={priorityFilter === key
              ? { background: "#0d3d3d", color: "#fff" }
              : { background: "transparent", border: "1px solid rgba(13,61,61,0.18)", color: "#4a6060" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {isError && <ErrorBanner message="Failed to load HITL queue." />}

      {isLoading ? (
        <FullPageSpinner />
      ) : reviews.length === 0 ? (
        <div className="glass-card p-8">
          <EmptyState title="Queue is clear" description="No pending reviews at this priority level." />
        </div>
      ) : (
        /* Split master-detail layout */
        <div className="flex gap-4 min-h-0" style={{ height: "calc(100vh - 220px)" }}>
          {/* LEFT — Queue list */}
          <div className="glass-card flex flex-col overflow-hidden" style={{ width: "340px", flexShrink: 0 }}>
            {/* List header */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(13,61,61,0.08)" }}>
              <p className="label-caps text-[#4a6060]">Pending signals</p>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-0.5">
                {reviews.map((review) => (
                  <QueueCard
                    key={review._id}
                    review={review}
                    isSelected={selectedId === review._id}
                    onSelect={() => setSelectedId(review._id)}
                  />
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(13,61,61,0.08)" }}>
                <span className="text-[11px]" style={{ color: "#8da8a8" }}>
                  {page}/{totalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="px-2.5 py-1 text-[11px] rounded-lg transition-colors disabled:opacity-40"
                    style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}
                    className="px-2.5 py-1 text-[11px] rounded-lg transition-colors disabled:opacity-40"
                    style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Detail panel */}
          <div className="glass-card flex-1 overflow-hidden">
            {selected ? (
              <DetailPanel
                review={selected}
                canOverride={canOverride}
                actingIds={actingIds}
                onApprove={approve}
                onReject={reject}
                onOverride={setOverrideTarget}
              />
            ) : (
              <DetailPlaceholder total={total} />
            )}
          </div>
        </div>
      )}

      {/* Override modal */}
      {overrideTarget && (
        <Modal open onClose={() => setOverrideTarget(null)} title="Override Classification" size="md">
          <OverrideModal review={overrideTarget} onClose={() => setOverrideTarget(null)} />
        </Modal>
      )}

      {/* Dispatch modal */}
      {dispatchTarget && (
        <Modal open onClose={() => setDispatchTarget(null)} title="Review Approved — Dispatch Response" size="md">
          <DispatchModal review={dispatchTarget} onClose={() => setDispatchTarget(null)} />
        </Modal>
      )}
    </div>
  );
}
