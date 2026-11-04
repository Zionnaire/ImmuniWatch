import { type ClassificationLabel, type PostLanguage, type PostPlatform, type HITLPriority, type AlertSeverity, type UserRole } from '../types/api';

export function clsx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export const LABEL_META: Record<ClassificationLabel, { label: string; color: string }> = {
  misinformation: { label: 'Misinformation', color: 'bg-red-100 text-red-700 border border-red-200' },
  factual:        { label: 'Factual',         color: 'bg-green-100 text-green-700 border border-green-200' },
  irrelevant:     { label: 'Irrelevant',      color: 'bg-slate-100 text-slate-500 border border-slate-200' },
  pending:        { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
};

export const PRIORITY_META: Record<HITLPriority, { label: string; color: string }> = {
  high:     { label: 'High',     color: 'bg-red-100 text-red-700' },
  standard: { label: 'Standard', color: 'bg-slate-100 text-slate-600' },
};

export const SEVERITY_META: Record<AlertSeverity, { color: string }> = {
  high:   { color: 'bg-red-500' },
  medium: { color: 'bg-orange-400' },
  low:    { color: 'bg-yellow-400' },
  info:   { color: 'bg-blue-400' },
};

export const LANG_LABELS: Record<PostLanguage, string> = {
  en: 'English', pcm: 'Pidgin', ha: 'Hausa', yo: 'Yoruba', ig: 'Igbo',
};

export const PLATFORM_LABELS: Record<PostPlatform, string> = {
  twitter: 'Twitter/X', facebook: 'Facebook', youtube: 'YouTube',
  bluesky: 'Bluesky',   instagram: 'Instagram', submission: 'Submission',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  analyst:        'Analyst',
  senior_analyst: 'Senior Analyst',
  supervisor:     'Supervisor',
  org_admin:      'Health Center Admin',
  super_admin:    'Platform Super Admin',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  analyst:        'bg-surface-high text-on-surface-variant',
  senior_analyst: 'bg-blue-100 text-blue-700',
  supervisor:     'bg-[rgba(141,245,227,0.35)] text-[#005048]',
  org_admin:      'bg-[rgba(141,245,227,0.35)] text-[#005048]',
  super_admin:    'bg-purple-100 text-purple-700',
};

export const ORG_STATUS_META: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-[rgba(141,245,227,0.35)] text-[#005048]' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-600' },
  trial:     { label: 'Trial',     color: 'bg-amber-100 text-amber-700' },
};

export const ORG_PLAN_META: Record<string, { label: string; color: string }> = {
  basic:    { label: 'Basic',    color: 'bg-gray-100 text-gray-600' },
  standard: { label: 'Standard', color: 'bg-blue-100 text-blue-600' },
  premium:  { label: 'Premium',  color: 'bg-purple-100 text-purple-600' },
};

export const LANG_FLAGS: Record<PostLanguage, string> = {
  en: '🇬🇧', pcm: '🇳🇬', ha: '🇳🇬', yo: '🇳🇬', ig: '🇳🇬',
};
