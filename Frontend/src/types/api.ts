// Changes vs. original:
//   • LanguageMetrics: sampleCount now optional (not in ML service v1.0.0 response),
//     recall field added
//   • AppSettings: new type for the /settings endpoint
//   • PipelineStatus.status: added 'mock' state (when ML_MOCK_MODE=true)

// ── Enums (mirror backend) ────────────────────────────────────────────────────

export type UserRole =
  | "analyst"
  | "senior_analyst"
  | "supervisor"
  | "org_admin"
  | "super_admin";
export type PostPlatform = "twitter" | "facebook" | "youtube" | "bluesky" | "instagram" | "submission";
export type PostLanguage = "en" | "pcm" | "ha" | "yo" | "ig";
export type ClassificationLabel =
  | "misinformation"
  | "factual"
  | "irrelevant"
  | "pending";
export type HITLPriority = "high" | "standard";
export type HITLStatus = "pending" | "approved" | "rejected" | "overridden";
export type AlertSeverity = "high" | "medium" | "low" | "info";
export type AlertTriggerType =
  | "surge"
  | "psi_drift"
  | "model_update"
  | "connector_error"
  | "override_rate";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:             string;
  name:           string;
  email:          string;
  role:           UserRole;
  organizationId: string | null;
  organization?:  { id: string; name: string; slug: string } | null;
}

// ── Organization ──────────────────────────────────────────────────────────────

export type OrgPlan   = 'basic' | 'standard' | 'premium';
export type OrgStatus = 'active' | 'suspended' | 'trial';

export interface Organization {
  _id:                  string;
  name:                 string;
  slug:                 string;
  description?:         string;
  region:               string;
  state:                string;
  contactEmail:         string;
  phoneNumber?:         string;
  logoUrl?:             string;
  plan:                 OrgPlan;
  status:               OrgStatus;
  userCount:            number;
  adminClaimed:         boolean;
  claimLink?:           string | null;
  claimTokenExpiresAt?: string | null;
  createdBy:            string | { name: string; email: string };
  createdAt:            string;
  updatedAt:            string;
}

export interface OrgStats {
  postsToday:  number;
  postsTotal:  number;
  hitlPending: number;
  hitlTotal:   number;
  openAlerts:  number;
}

export interface OrgDetail extends Organization {
  users: User[];
  stats: OrgStats;
}

export interface PlatformOverview {
  summary: {
    totalOrgs:   number;
    activeOrgs:  number;
    totalUsers:  number;
    postsToday:  number;
    postsTotal:  number;
    hitlPending: number;
    openAlerts:  number;
  };
  recentOrgs:    Organization[];
  organizations: (Organization & { postsToday: number; hitlPending: number })[];
}

export interface LoginResponse {
  user: AuthUser;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export interface Classification {
  _id: string;
  postId: string;
  label: ClassificationLabel;
  confidence: number;
  fallback: boolean;
  modelVersion: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  externalId?: string;
  platform: PostPlatform;
  content: string;
  language: PostLanguage;
  authorHandle?: string;
  ingestedAt: string;
  createdAt: string;
  archivedAt?: string;
  classification?: Classification | null;
  hitlReview?: {
    _id: string;
    status: HITLStatus;
    priority: HITLPriority;
  } | null;
}

// ── HITL ──────────────────────────────────────────────────────────────────────

export interface HITLReview {
  _id: string;
  postId: Post | string;
  classificationId: Classification | string;
  priority: HITLPriority;
  status: HITLStatus;
  notes?: string;
  reviewerNote?: string;
  overriddenLabel?: ClassificationLabel;
  proposedResponse?: string;
  approvedResponse?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface Alert {
  _id: string;
  severity: AlertSeverity;
  triggerType: AlertTriggerType;
  title: string;
  message: string;
  affectedLanguage?: PostLanguage;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

// ── Model Health ──────────────────────────────────────────────────────────────

export interface LanguageMetrics {
  macroF1: number;
  recall: number; // added — now returned by ML service
  psi: number;
  sampleCount?: number; // optional — not returned by ML service v1.0.0
}

export interface ModelMetrics {
  _id: string;
  modelVersion: string;
  macroF1: number;
  recall: number;
  precision: number;
  inferenceP95ms: number;
  perLanguage: Partial<Record<PostLanguage, LanguageMetrics>>;
  feedbackQueue: number;
  lastRetrain?: string;
  computedAt?: string; // when the ML service computed these metrics
  stale?: boolean; // true when served from MongoDB cache (ML service unreachable)
  createdAt: string;
}

export interface RetrainingHistory {
  _id: string;
  runId: string;
  modelVersionBefore: string;
  modelVersionAfter?: string;
  f1Before: number;
  f1After?: number;
  status: "promoted" | "rejected" | "archived" | "in_progress";
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export interface KBDocument {
  _id:           string;
  title:         string;
  source:        string;
  language:      PostLanguage;
  cloudinaryUrl?: string;
  embedded:      boolean;
  mlIndexed?:    boolean;
  mlDocId?:      string;
  status?:       "ready" | "not_synced" | "processing" | "failed";
  chunkCount?:   number;
  tags:          string[];
  createdAt:     string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface User {
  _id:            string;
  name:           string;
  email:          string;
  role:           UserRole;
  organizationId?: string;
  isActive:       boolean;
  lastActive?:    string;
  createdAt:      string;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditEntry {
  _id: string;
  actor: string | { _id: string; name: string; role: UserRole };
  actorName?: string;
  actorRole?: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  newValue?: unknown;
  oldValue?: unknown;
  createdAt: string;
}

// ── Paginated response ────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Trends ───────────────────────────────────────────────────────────────────

export interface ClassificationBreakdownItem {
  label: ClassificationLabel;
  count: number;
}

export interface NarrativeItem {
  narrative: string;
  count: number;
  label: ClassificationLabel;
  trend: number[];
}

export interface PlatformIngestionItem {
  _id: string;
  count: number;
}

export interface LanguageDistributionItem {
  _id: PostLanguage;
  count: number;
}

export interface DailyMisinformationItem {
  date: string;
  count: number;
}

export interface DailyBreakdownItem {
  date: string;
  day: string;
  misinformation: number;
  factual: number;
  irrelevant: number;
}

export interface FeedbackItem {
  _id: string;
  postId: string;
  originalLabel: ClassificationLabel;
  correctedLabel: ClassificationLabel;
  createdAt: string;
}

// ── HITL stats ────────────────────────────────────────────────────────────────

export interface HITLMyStats {
  reviewedToday: number;
  reviewedThisWeek: number;
  overrideRate: number;
  pendingTotal: number;
}

export interface HITLTeamStats {
  reviewedToday: number;
  reviewedThisWeek: number;
  overrideRate: number;
  pendingHigh: number;
  pendingStandard: number;
  topReviewers: Array<{ name: string; count: number }>;
}

// ── Live feed ─────────────────────────────────────────────────────────────────

export interface RecentPost {
  post_id:         string;
  content_snippet: string;
  label:           ClassificationLabel;
  confidence:      number;
  entropy:         number;
  language:        PostLanguage | null;
  state:           string | null;
  platform:        PostPlatform;
  classified_at:   string;
}

export interface RecentFeedResponse {
  posts:             RecentPost[];
  count:             number;
  total_since_start: number;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export interface PipelineStatus {
  // Added 'mock' — returned when ML_MOCK_MODE=true so the frontend can show a banner
  status: "healthy" | "degraded" | "fallback" | "retraining" | "mock";
  retrainingStartedAt?: string;
  mockMode?: boolean;
  mlService: {
    url: string;
    circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
    healthy: boolean;
    modelVersion: string;
    lastHealthError: string | null;
    lastChecked: string;
  };
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface SystemInfo {
  region: string;
  organisation: string;
  backendVersion: string;
  frontendVersion: string;
  mlServiceUrl: string;
  mlServiceStatus: "ok" | "unavailable" | "degraded";
  mlModelVersion: string;
  mockMode: boolean;
  kafkaEnabled: boolean;
}

export interface AppSettings {
  // ── Alert thresholds ──────────────────────────────────────────────────────
  surgePosts:            number;   // posts on one claim in 2 h before surge alert
  hitlAutoEscalateAbove: number;   // confidence % above which HITL → high priority
  psiDriftAlert:         number;   // PSI threshold for drift alert
  overrideRateAlert:     number;   // analyst override % that triggers alert
 
  // ── Model performance targets ─────────────────────────────────────────────
  macroF1Target:    number;        // minimum acceptable macro-F1 before retrain alert
  inferenceP95Ms:   number;        // maximum acceptable p95 latency (ms)
  feedbackQueueMax: number;        // trigger retrain when feedback queue exceeds this
 
  // ── Notifications ─────────────────────────────────────────────────────────
  notifEmail: string;
 
  // ── Read-only (never sent in PATCH requests — see AppSettingsPatch) ───────
  readonly systemInfo: SystemInfo;
  readonly updatedAt?: string;
}
 
/**
 * The subset of AppSettings that may be sent in a PATCH /settings request.
 * Strips the read-only server-side fields so the compiler prevents accidentally
 * sending systemInfo or updatedAt to the backend.
 */
export type AppSettingsPatch = Partial<Omit<AppSettings, 'systemInfo' | 'updatedAt'>>;
