import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Pencil, KeyRound, Trash2, Eye, Copy, CheckCheck, Users as UsersIcon } from "lucide-react";
import { usersApi } from "../api/users";
import { Modal } from "../components/Modal";
import { FullPageSpinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useViewerMode } from "../context/ViewerModeContext";
import { formatDateTime, ROLE_LABELS } from "../lib/utils";
import type { User, UserRole } from "../types/api";

function apiMsg(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

const ORG_ASSIGNABLE = (Object.keys(ROLE_LABELS) as UserRole[]).filter(
  (r) => r !== "super_admin" && r !== "org_admin",
);

const ROLE_CHIP: Record<UserRole, { bg: string; color: string; border: string }> = {
  super_admin:    { bg: "rgba(176,139,191,0.12)", color: "#7b4ea0", border: "rgba(176,139,191,0.22)" },
  org_admin:      { bg: "rgba(0,137,123,0.10)",   color: "#005048", border: "rgba(0,137,123,0.18)"   },
  supervisor:     { bg: "rgba(91,164,207,0.12)",  color: "#1a6fa0", border: "rgba(91,164,207,0.20)"  },
  senior_analyst: { bg: "rgba(0,137,123,0.08)",   color: "#00897b", border: "rgba(0,137,123,0.14)"   },
  analyst:        { bg: "rgba(74,96,96,0.08)",    color: "#4a6060", border: "rgba(74,96,96,0.14)"    },
};

// Shared modal form styles
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

// ── Create user modal ──────────────────────────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc    = useQueryClient();
  const toast = useToast().toast;
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState<UserRole>("analyst");
  const [error, setError] = useState("");
  const [link, setLink]   = useState("");
  const [copied, setCopied] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.invite({ name, email, role }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User invited", `Invite link generated for ${name}.`);
      setLink(data.inviteLink);
    },
    onError: (err: unknown) => setError(apiMsg(err, "Failed to create user. Email may already be in use.")),
  });

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (link) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,137,123,0.07)", border: "1px solid rgba(0,137,123,0.18)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#005048" }}>Invite link generated</p>
          <p className="text-xs" style={{ color: "#005048" }}>
            Share with <strong>{name}</strong>. They'll click it to set their password. Expires in <strong>72 hours</strong>.
          </p>
        </div>
        <div>
          <label style={labelStyle}>Invite Link</label>
          <div className="flex gap-2">
            <input readOnly value={link} style={{ ...inputStyle, fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }} className="min-w-0 truncate flex-1" />
            <button
              onClick={() => { void copy(); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
              style={copied
                ? { background: "#0d3d3d", color: "#fff", border: "1px solid #0d3d3d" }
                : { background: "transparent", color: "#4a6060", border: "1px solid rgba(13,61,61,0.15)" }
              }
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary px-4 py-2 text-sm">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "#8da8a8" }}>An invite link will be generated. No password is set by you — the user creates their own.</p>
      <div>
        <label style={labelStyle}>Full Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Danladi" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Email Address</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@nphcda.gov.ng" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={inputStyle}>
          {ORG_ASSIGNABLE.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.18)", color: "#c0392b" }}>{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Cancel</button>
        <button
          onClick={() => { setError(""); mutate(); }}
          disabled={isPending || !name.trim() || !email.trim()}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          {isPending ? "Generating…" : "Generate Invite Link"}
        </button>
      </div>
    </div>
  );
}

// ── Edit user modal ────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc    = useQueryClient();
  const toast = useToast().toast;
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.update(user._id, { name: name.trim(), role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated", `${name} is now ${ROLE_LABELS[role]}.`);
      onClose();
    },
    onError: (err) => setError(apiMsg(err, "Failed to update user.")),
  });

  return (
    <div className="space-y-4">
      <div>
        <label style={labelStyle}>Full Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={inputStyle}>
          {ORG_ASSIGNABLE.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>
      <div className="rounded-xl px-3 py-2" style={{ background: "rgba(13,61,61,0.04)", border: "1px solid rgba(13,61,61,0.08)" }}>
        <p className="text-[11px]" style={{ color: "#4a6060" }}>
          Email: <span className="font-medium" style={{ color: "#0f2626" }}>{user.email}</span>
        </p>
      </div>
      {error && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.18)", color: "#c0392b" }}>{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Cancel</button>
        <button onClick={() => { setError(""); mutate(); }} disabled={isPending || !name.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Reset password modal ───────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToast().toast;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.resetPassword(user._id, password),
    onSuccess: () => {
      toast.success("Password reset", `${user.name}'s password has been updated and all sessions invalidated.`);
      onClose();
    },
    onError: (err) => setError(apiMsg(err, "Failed to reset password.")),
  });

  function submit() {
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    mutate();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "#4a6060" }}>
        Set a new password for <span className="font-semibold" style={{ color: "#0f2626" }}>{user.name}</span>. Their current sessions will be invalidated.
      </p>
      <div>
        <label style={labelStyle}>New Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Confirm Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" style={inputStyle} />
      </div>
      {error && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.18)", color: "#c0392b" }}>{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Cancel</button>
        <button
          onClick={submit}
          disabled={isPending || !password || !confirm}
          className="px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-60"
          style={{ background: "rgba(217,119,6,0.12)", color: "#b45309", border: "1px solid rgba(217,119,6,0.22)" }}
        >
          {isPending ? "Resetting…" : "Reset Password"}
        </button>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────────────────────
function DeleteUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc    = useQueryClient();
  const toast = useToast().toast;
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.delete(user._id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted", `${user.name} has been permanently removed.`);
      onClose();
    },
    onError: (err) => setError(apiMsg(err, "Failed to delete user.")),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "#0f2626" }}>
        Permanently delete <span className="font-semibold">{user.name}</span> ({user.email})? This cannot be undone.
      </p>
      {error && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.18)", color: "#c0392b" }}>{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060" }}>Cancel</button>
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-60"
          style={{ background: "rgba(192,57,43,0.10)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.22)" }}
        >
          {isPending ? "Deleting…" : "Delete User"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
type ActiveModal =
  | { type: "create" }
  | { type: "edit"; user: User }
  | { type: "reset-password"; user: User }
  | { type: "delete"; user: User }
  | null;

export default function Users() {
  const { user: me } = useAuth();
  const qc           = useQueryClient();
  const toast        = useToast().toast;
  const isViewerMode = useViewerMode();
  const isSuperAdmin = me?.role === "super_admin";
  const isOrgAdmin   = me?.role === "org_admin";
  const canEdit = !isViewerMode && (isSuperAdmin || isOrgAdmin);
  const canView = canEdit || me?.role === "supervisor" || isOrgAdmin;

  const [modal, setModal] = useState<ActiveModal>(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn:  () => usersApi.list(),
    enabled:  canView,
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => usersApi.update(id, { active }),
    onSuccess: (_data, { active }) => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(active ? "User activated" : "User deactivated");
    },
    onError: (err) => toast.error("Update failed", apiMsg(err, "Could not update user status.")),
  });

  const closeModal = () => setModal(null);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(176,139,191,0.12)" }}>
              <UsersIcon style={{ width: "16px", height: "16px", color: "#B08BBF" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f2626", fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>
              Team & Permissions
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: "#4a6060" }}>
            {canEdit ? "Manage team members, invite new users, and control role assignments" : "View team members and their access levels"}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setModal({ type: "create" })} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm flex-shrink-0">
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        )}
      </div>

      {isError && <ErrorBanner message="Failed to load users." />}

      {/* Role hierarchy legend */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#B08BBF" }} />
          <h2 className="label-caps text-[#4a6060]">Role Hierarchy</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ROLE_CHIP) as [UserRole, typeof ROLE_CHIP[UserRole]][]).map(([role, chip]) => (
            <span
              key={role}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-xl"
              style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8"><FullPageSpinner /></div>
        ) : users.length === 0 ? (
          <div className="p-8"><EmptyState title="No users" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[580px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = me?.id === u._id;
                  const chip   = ROLE_CHIP[u.role];
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: "#0f2626" }}>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg" style={{ background: "rgba(0,137,123,0.10)", color: "#00897b", border: "1px solid rgba(0,137,123,0.18)" }}>
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs" style={{ color: "#4a6060" }}>{u.email}</td>
                      <td>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-xl"
                          style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-xl"
                          style={u.isActive
                            ? { background: "rgba(0,137,123,0.08)", color: "#005048", border: "1px solid rgba(0,137,123,0.14)" }
                            : { background: "rgba(74,96,96,0.07)", color: "#4a6060", border: "1px solid rgba(74,96,96,0.12)" }
                          }
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="tabular-nums text-xs" style={{ color: "#8da8a8" }}>{formatDateTime(u.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && !isSelf && (
                            <>
                              <button
                                onClick={() => setModal({ type: "edit", user: u })}
                                title="Edit name / role"
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: "#8da8a8" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#0f2626"; (e.currentTarget as HTMLElement).style.background = "rgba(13,61,61,0.06)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8da8a8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setModal({ type: "reset-password", user: u })}
                                title="Reset password"
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: "#8da8a8" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#d97706"; (e.currentTarget as HTMLElement).style.background = "rgba(217,119,6,0.08)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8da8a8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => toggleActive({ id: u._id, active: !u.isActive })}
                                title={u.isActive ? "Deactivate" : "Activate"}
                                className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                                style={{ border: "1px solid rgba(13,61,61,0.15)", color: "#4a6060", background: "transparent" }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget as HTMLElement;
                                  if (u.isActive) { el.style.borderColor = "rgba(192,57,43,0.30)"; el.style.color = "#c0392b"; }
                                  else { el.style.borderColor = "rgba(0,137,123,0.30)"; el.style.color = "#00897b"; }
                                }}
                                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(13,61,61,0.15)"; el.style.color = "#4a6060"; }}
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => setModal({ type: "delete", user: u })}
                                title="Delete user"
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: "#8da8a8" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#c0392b"; (e.currentTarget as HTMLElement).style.background = "rgba(192,57,43,0.08)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8da8a8"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {!canEdit && <Eye className="h-3.5 w-3.5" style={{ color: "rgba(13,61,61,0.20)" }} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal?.type === "create"}         onClose={closeModal} title="Add Team Member"   size="sm"><CreateUserModal onClose={closeModal} /></Modal>
      <Modal open={modal?.type === "edit"}           onClose={closeModal} title="Edit User"          size="sm">{modal?.type === "edit"           && <EditUserModal user={modal.user} onClose={closeModal} />}</Modal>
      <Modal open={modal?.type === "reset-password"} onClose={closeModal} title="Reset Password"     size="sm">{modal?.type === "reset-password" && <ResetPasswordModal user={modal.user} onClose={closeModal} />}</Modal>
      <Modal open={modal?.type === "delete"}         onClose={closeModal} title="Delete User"        size="sm">{modal?.type === "delete"         && <DeleteUserModal user={modal.user} onClose={closeModal} />}</Modal>
    </div>
  );
}
