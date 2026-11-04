import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, Radio, ClipboardCheck, AlertTriangle,
  TrendingUp, Plus, ChevronRight, Copy, CheckCheck, Link2, Globe,
} from "lucide-react";
import { orgsApi } from "../api/organizations";
import { FullPageSpinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { StatCard } from "../components/StatCard";
import { Modal } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../lib/utils";
import type { Organization } from "../types/api";

// ── Chip maps ──────────────────────────────────────────────────────────────────
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

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

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

// ── Create Org Modal ───────────────────────────────────────────────────────────
function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const toast    = useToast().toast;
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", region: "", state: "", contactEmail: "", phoneNumber: "", plan: "basic" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [claimLink, setClaimLink] = useState("");
  const [orgId, setOrgId]       = useState("");
  const [copied, setCopied]     = useState(false);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const org = await orgsApi.create({
        name: form.name, description: form.description || undefined,
        region: form.region, state: form.state, contactEmail: form.contactEmail,
        phoneNumber: form.phoneNumber || undefined, plan: form.plan,
      });
      toast.success("Organization created", "Share the invite link with the org admin.");
      setClaimLink((org as unknown as { claimLink?: string }).claimLink ?? "");
      setOrgId(org._id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(claimLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (claimLink) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.18)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#005048" }}>Organization created successfully!</p>
          <p className="text-xs" style={{ color: "#005048" }}>
            Share this invite link with the person who will manage this health center. They'll register as <strong>Organization Admin</strong>. Link expires in <strong>30 days</strong>.
          </p>
        </div>
        <div>
          <label style={labelStyle} className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Admin Invite Link</label>
          <div className="flex gap-2">
            <input readOnly value={claimLink} style={{ ...inputStyle, fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }} className="min-w-0 truncate flex-1" />
            <button
              onClick={() => { void copy(); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
              style={copied ? { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" } : { background: "transparent", color: "#4a6060", border: "1px solid rgba(13,61,61,0.15)" }}
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: "#8da8a8" }}>You can also copy this link later from the organization detail page.</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Close</button>
          <button onClick={() => { onClose(); navigate(`/organizations/${orgId}`); }} className="btn-primary px-4 py-2 text-sm">View Organization</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label style={labelStyle}>Organization Name *</label><input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Lagos State PHC" style={inputStyle} /></div>
        <div><label style={labelStyle}>Contact Email *</label><input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="admin@health.gov.ng" style={inputStyle} /></div>
        <div><label style={labelStyle}>Region / LGA *</label><input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Lagos Island" style={inputStyle} /></div>
        <div>
          <label style={labelStyle}>State *</label>
          <select value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle}>
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label style={labelStyle}>Phone Number</label><input type="tel" value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} placeholder="+234 …" style={inputStyle} /></div>
        <div>
          <label style={labelStyle}>Plan</label>
          <select value={form.plan} onChange={(e) => set("plan", e.target.value)} style={inputStyle}>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Brief description of this health center…" style={{ ...inputStyle, resize: "none" }} />
      </div>
      {error && <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.18)", color: "#c0392b" }}>{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Cancel</button>
        <button onClick={submit} disabled={loading || !form.name || !form.contactEmail || !form.region || !form.state} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {loading ? "Creating…" : "Create Organization"}
        </button>
      </div>
    </div>
  );
}

// ── Org row ────────────────────────────────────────────────────────────────────
function OrgRow({ org }: { org: Organization & { postsToday: number; hitlPending: number } }) {
  const navigate = useNavigate();
  const status   = ORG_STATUS_CHIP[org.status] ?? ORG_STATUS_CHIP.active;
  const plan     = ORG_PLAN_CHIP[org.plan]     ?? ORG_PLAN_CHIP.basic;

  return (
    <tr
      onClick={() => navigate(`/organizations/${org._id}`)}
      className="cursor-pointer transition-colors"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.025)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <td>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,137,123,0.10)", border: "1px solid rgba(0,137,123,0.16)" }}>
            <Building2 className="h-4 w-4" style={{ color: "#00897b" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#0f2626" }}>{org.name}</p>
            <p className="text-xs" style={{ color: "#8da8a8" }}>{org.region}, {org.state}</p>
          </div>
        </div>
      </td>
      <td>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
          {status.label}
        </span>
      </td>
      <td>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: plan.bg, color: plan.color, border: `1px solid ${plan.border}` }}>
          {plan.label}
        </span>
      </td>
      <td className="text-center tabular-nums text-xs" style={{ color: "#4a6060" }}>{org.userCount}</td>
      <td className="text-center tabular-nums text-xs" style={{ color: "#4a6060" }}>{org.postsToday.toLocaleString()}</td>
      <td className="text-center">
        {org.hitlPending > 0 ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(192,57,43,0.10)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.18)" }}>
            {org.hitlPending}
          </span>
        ) : (
          <span style={{ color: "#8da8a8" }}>—</span>
        )}
      </td>
      <td className="text-xs tabular-nums" style={{ color: "#8da8a8" }}>{formatDateTime(org.createdAt)}</td>
      <td><ChevronRight className="h-3.5 w-3.5" style={{ color: "#8da8a8" }} /></td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PlatformOverview() {
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["platform-overview"],
    queryFn:  () => orgsApi.platformOverview(),
    refetchInterval: 60_000,
  });

  if (isLoading) return <FullPageSpinner />;
  if (isError || !data) return <ErrorBanner message="Failed to load platform overview." />;

  const { summary, organizations } = data;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,137,123,0.12)" }}>
              <Globe style={{ width: "16px", height: "16px", color: "#00897b" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
              Super Admin Console
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            All health center organizations — {summary.activeOrgs} active of {summary.totalOrgs} total
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Organization
        </button>
      </div>

      {/* Primary KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Organizations"  value={summary.totalOrgs}  icon={Building2}     color="teal"  />
        <StatCard label="Total Users"          value={summary.totalUsers} icon={Users}         color="ocean" />
        <StatCard label="Posts Today"          value={summary.postsToday} icon={Radio}         color="peach" />
        <StatCard label="HITL Pending"         value={summary.hitlPending} icon={ClipboardCheck} color="mauve" />
      </div>

      {/* Secondary KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Orgs"   value={summary.activeOrgs}                      icon={TrendingUp}  color="teal"  />
        <StatCard label="Total Posts"   value={summary.postsTotal}                      icon={Radio}       color="ocean" />
        <StatCard label="Open Alerts"   value={summary.openAlerts}                      icon={AlertTriangle} color="peach" />
        <StatCard label="Inactive Orgs" value={summary.totalOrgs - summary.activeOrgs}  icon={Building2}   color="mauve" />
      </div>

      {/* Organizations table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(13,61,61,0.08)" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00897b" }} />
            <h2 className="label-caps text-[#4a6060]">Health Center Organizations</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,137,123,0.10)", color: "#00897b" }}>
              {organizations.length}
            </span>
          </div>
        </div>
        {organizations.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-3" style={{ color: "rgba(13,61,61,0.15)" }} />
            <p className="text-sm font-semibold" style={{ color: "#4a6060" }}>No organizations yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "#8da8a8" }}>Create the first health center to get started.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">Create Organization</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[660px]">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th className="text-center">Users</th>
                  <th className="text-center">Posts Today</th>
                  <th className="text-center">HITL</th>
                  <th>Created</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {organizations.map((o) => <OrgRow key={o._id} org={o} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); void refetch(); }} title="Create Organization" size="md">
        <CreateOrgModal onClose={() => { setShowCreate(false); void refetch(); }} />
      </Modal>
    </div>
  );
}
