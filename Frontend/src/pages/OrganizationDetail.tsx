import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Users, Radio, ClipboardCheck, AlertTriangle,
  Pencil, Copy, CheckCheck, ToggleLeft, ToggleRight, RefreshCw, Link2, ShieldCheck,
} from "lucide-react";
import { orgsApi } from "../api/organizations";
import { FullPageSpinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { useToast } from "../context/ToastContext";
import { formatDateTime, ROLE_LABELS } from "../lib/utils";
import type { User, OrgDetail, UserRole } from "../types/api";

// ── Local chip maps ────────────────────────────────────────────────────────────
const ORG_STATUS_CHIP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active:    { bg: "rgba(0,137,123,0.08)",  color: "#005048", border: "rgba(0,137,123,0.18)",  label: "Active"    },
  suspended: { bg: "rgba(192,57,43,0.08)",  color: "#c0392b", border: "rgba(192,57,43,0.18)",  label: "Suspended" },
  pending:   { bg: "rgba(217,119,6,0.08)",  color: "#b45309", border: "rgba(217,119,6,0.18)",  label: "Pending"   },
};

const ORG_PLAN_CHIP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  basic:    { bg: "rgba(74,96,96,0.07)",    color: "#4a6060", border: "rgba(74,96,96,0.14)",    label: "Basic"    },
  standard: { bg: "rgba(91,164,207,0.10)",  color: "#1a6fa0", border: "rgba(91,164,207,0.18)", label: "Standard" },
  premium:  { bg: "rgba(176,139,191,0.10)", color: "#7b4ea0", border: "rgba(176,139,191,0.18)", label: "Premium"  },
};

const ROLE_CHIP: Record<UserRole, { bg: string; color: string; border: string }> = {
  super_admin:    { bg: "rgba(176,139,191,0.12)", color: "#7b4ea0", border: "rgba(176,139,191,0.22)" },
  org_admin:      { bg: "rgba(0,137,123,0.10)",   color: "#005048", border: "rgba(0,137,123,0.18)"   },
  supervisor:     { bg: "rgba(91,164,207,0.12)",  color: "#1a6fa0", border: "rgba(91,164,207,0.20)"  },
  senior_analyst: { bg: "rgba(0,137,123,0.08)",   color: "#00897b", border: "rgba(0,137,123,0.14)"   },
  analyst:        { bg: "rgba(74,96,96,0.08)",    color: "#4a6060", border: "rgba(74,96,96,0.14)"    },
};

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(13,61,61,0.15)", background: "rgba(255,255,255,0.9)",
  color: "#0f2626", borderRadius: "12px", padding: "10px 12px", fontSize: "14px",
  width: "100%", outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "6px",
  color: "#4a6060", fontFamily: '"Plus Jakarta Sans", sans-serif',
  letterSpacing: "0.04em", textTransform: "uppercase",
};

// ── Claim link panel ───────────────────────────────────────────────────────────
function ClaimLinkPanel({ org }: { org: OrgDetail }) {
  const qc    = useQueryClient();
  const toast = useToast().toast;
  const [copied, setCopied] = useState(false);

  const { mutate: regenerate, isPending: regenerating } = useMutation({
    mutationFn: () => orgsApi.regenerateClaimLink(org._id),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["org", org._id] });
      toast.success("New invite link generated", "Share the new link. The old link is now invalid.");
      void navigator.clipboard.writeText(data.claimLink).catch(() => {});
    },
    onError: () => toast.error("Failed to regenerate link"),
  });

  async function copy(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (org.adminClaimed) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" style={{ color: "#00897b" }} />
            <h2 className="label-caps text-[#4a6060]">Admin Access</h2>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: "rgba(0,137,123,0.08)", color: "#005048", border: "1px solid rgba(0,137,123,0.18)" }}>
            Claimed
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: "#4a6060" }}>
          An administrator has registered for this organization. The original claim link has been consumed.
        </p>
        <p className="text-xs mb-4" style={{ color: "#8da8a8" }}>
          Need to replace the org admin? Generate a new invite link. The existing admin's account will <strong>not</strong> be removed automatically.
        </p>
        <button
          onClick={() => regenerate()}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors"
          style={{ border: "1px solid rgba(217,119,6,0.22)", color: "#b45309", background: "rgba(217,119,6,0.06)" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          Generate New Admin Invite Link
        </button>
      </div>
    );
  }

  const link = org.claimLink;

  return (
    <div className="glass-card p-5" style={{ boxShadow: "inset 3px 0 0 #00897b" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4" style={{ color: "#00897b" }} />
          <h2 className="label-caps text-[#4a6060]">Admin Invite Link</h2>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: "rgba(217,119,6,0.08)", color: "#b45309", border: "1px solid rgba(217,119,6,0.18)" }}>
          Pending
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: "#4a6060" }}>
        Share this link with the person who will manage <strong>{org.name}</strong>. When they click it, they'll register as <strong>Organization Admin</strong>. Link can only be used once.
      </p>

      {link ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input readOnly value={link} style={{ ...inputStyle, fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }} className="min-w-0 truncate flex-1" />
            <button
              onClick={() => { void copy(link); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
              style={copied ? { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" } : { background: "transparent", color: "#4a6060", border: "1px solid rgba(13,61,61,0.15)" }}
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          {org.claimTokenExpiresAt && (
            <p className="text-[11px]" style={{ color: "#8da8a8" }}>Expires: {formatDateTime(org.claimTokenExpiresAt)}</p>
          )}
          <button
            onClick={() => regenerate()}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "#8da8a8" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4a6060"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8da8a8"; }}
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} /> Regenerate link
          </button>
        </div>
      ) : (
        <button onClick={() => regenerate()} disabled={regenerating} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
          <Link2 className="h-3.5 w-3.5" /> Generate Invite Link
        </button>
      )}
    </div>
  );
}

// ── Edit org modal ─────────────────────────────────────────────────────────────
function EditOrgModal({ orgId, defaultValues, onClose }: {
  orgId: string;
  defaultValues: { name: string; contactEmail: string; region: string; description?: string };
  onClose: () => void;
}) {
  const qc    = useQueryClient();
  const toast = useToast().toast;
  const [form, setForm] = useState(defaultValues);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => orgsApi.update(orgId, form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", orgId] });
      void qc.invalidateQueries({ queryKey: ["platform-overview"] });
      toast.success("Organization updated");
      onClose();
    },
    onError: () => setError("Failed to update organization."),
  });

  return (
    <div className="space-y-3">
      {[
        { label: "Name",           key: "name"         },
        { label: "Contact Email",  key: "contactEmail", type: "email" },
        { label: "Region / LGA",   key: "region"       },
        { label: "Description",    key: "description"  },
      ].map(({ label, key, type = "text" }) => (
        <div key={key}>
          <label style={labelStyle}>{label}</label>
          <input
            type={type}
            value={(form as Record<string, string>)[key] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            style={inputStyle}
          />
        </div>
      ))}
      {error && <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.18)", color: "#c0392b" }}>{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Cancel</button>
        <button onClick={() => mutate()} disabled={isPending || !form.name} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OrganizationDetail() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const toast        = useToast().toast;
  const [editOpen, setEditOpen] = useState(false);

  const { data: org, isLoading, isError } = useQuery({
    queryKey: ["org", id],
    queryFn:  () => orgsApi.get(id!),
    enabled:  !!id,
  });

  const { mutate: setStatus } = useMutation({
    mutationFn: (status: "active" | "suspended") => orgsApi.setStatus(id!, status),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ["org", id] });
      void qc.invalidateQueries({ queryKey: ["platform-overview"] });
      toast.success(`Organization ${updated.status}`, `${updated.name} status updated.`);
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) return <FullPageSpinner />;
  if (isError || !org) return <ErrorBanner message="Failed to load organization." />;

  const statusMeta = ORG_STATUS_CHIP[org.status] ?? ORG_STATUS_CHIP.active;
  const planMeta   = ORG_PLAN_CHIP[org.plan]     ?? ORG_PLAN_CHIP.basic;
  const isActive   = org.status === "active";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/organizations")}
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: "#8da8a8", border: "1px solid rgba(13,61,61,0.12)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#0f2626"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8da8a8"; }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,137,123,0.12)", border: "1px solid rgba(0,137,123,0.18)" }}>
            <Building2 className="h-5 w-5" style={{ color: "#00897b" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>{org.name}</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}>{statusMeta.label}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: planMeta.bg, color: planMeta.color, border: `1px solid ${planMeta.border}` }}>{planMeta.label}</span>
            </div>
            <p className="text-xs" style={{ color: "#8da8a8" }}>{org.region}, {org.state} · {org.contactEmail}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl"
            style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060", background: "transparent" }}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => setStatus(isActive ? "suspended" : "active")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors"
            style={isActive
              ? { border: "1px solid rgba(192,57,43,0.22)", color: "#c0392b", background: "rgba(192,57,43,0.06)" }
              : { border: "1px solid rgba(0,137,123,0.22)", color: "#005048", background: "rgba(0,137,123,0.06)" }
            }
          >
            {isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            {isActive ? "Suspend" : "Activate"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard label="Users"        value={org.userCount}           icon={Users}         color="teal"  />
        <StatCard label="Posts Today"  value={org.stats.postsToday}    icon={Radio}         color="ocean" />
        <StatCard label="Total Posts"  value={org.stats.postsTotal}    icon={Radio}         color="peach" />
        <StatCard label="HITL Pending" value={org.stats.hitlPending}   icon={ClipboardCheck} color="mauve" />
        <StatCard label="Open Alerts"  value={org.stats.openAlerts}    icon={AlertTriangle} color="peach" />
      </div>

      <ClaimLinkPanel org={org} />

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(13,61,61,0.08)" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5BA4CF" }} />
            <h2 className="label-caps text-[#4a6060]">Users</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(91,164,207,0.10)", color: "#1a6fa0" }}>{org.users.length}</span>
          </div>
          <span className="text-[11px]" style={{ color: "#8da8a8" }}>Managed by the org admin</span>
        </div>
        {org.users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users className="h-7 w-7 mx-auto mb-2" style={{ color: "rgba(13,61,61,0.15)" }} />
            <p className="text-sm font-semibold" style={{ color: "#4a6060" }}>No users yet</p>
            <p className="text-xs mt-1" style={{ color: "#8da8a8" }}>Share the invite link above so the org admin can register and onboard their team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[480px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {org.users.map((u: User) => {
                  const chip = ROLE_CHIP[u.role as UserRole] ?? ROLE_CHIP.analyst;
                  return (
                    <tr key={u._id}>
                      <td className="font-semibold" style={{ color: "#0f2626" }}>{u.name}</td>
                      <td className="text-xs" style={{ color: "#4a6060" }}>{u.email}</td>
                      <td>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xl" style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}>
                          {ROLE_LABELS[u.role as UserRole] ?? u.role}
                        </span>
                      </td>
                      <td>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xl" style={u.isActive
                          ? { background: "rgba(0,137,123,0.08)", color: "#005048", border: "1px solid rgba(0,137,123,0.14)" }
                          : { background: "rgba(74,96,96,0.07)", color: "#4a6060", border: "1px solid rgba(74,96,96,0.12)" }
                        }>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-xs tabular-nums" style={{ color: "#8da8a8" }}>{u.lastActive ? formatDateTime(u.lastActive) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {org.description && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8da8a8" }} />
            <h2 className="label-caps text-[#4a6060]">About</h2>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#4a6060" }}>{org.description}</p>
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Organization" size="sm">
        <EditOrgModal orgId={id!} defaultValues={{ name: org.name, contactEmail: org.contactEmail, region: org.region, description: org.description }} onClose={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}
