import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ViewerSummary {
  stats: {
    totalPosts:     number;
    todayPosts:     number;
    pendingReviews: number;
    misinfoRate:    number;
  };
  labels:    Array<{ label: string; count: number }>;
  platforms: Array<{ platform: string; count: number }>;
  recentPosts: Array<{
    content:    string;
    platform:   string;
    language:   string;
    ingestedAt: string;
    label:      string;
    confidence: number;
  }>;
  connectors: Array<{
    platform:     string;
    status:       'active' | 'degraded' | 'waiting';
    eventsPerMin: number;
    lastEventAt:  string;
  }>;
}

export interface ViewerPost {
  _id:        string;
  content:    string;
  platform:   string;
  language:   string;
  ingestedAt: string;
  externalId: string | null;
  label:      string;
  confidence: number;
}

export interface ViewerPostFeed {
  total: number;
  page:  number;
  limit: number;
  posts: ViewerPost[];
}

export interface ViewerQueueItem {
  _id:      string;
  postId:   { content: string; platform: string; language: string; ingestedAt: string } | null;
  priority: string;
  status:   string;
  createdAt:string;
  proposedResponse?: string;
}

export interface ViewerAlert {
  _id:         string;
  severity:    string;
  triggerType: string;
  title:       string;
  message:     string;
  platform?:   string;
  createdAt:   string;
}

// ── Client factory ───────────────────────────────────────────────────────────

export function createViewerApi(token: string) {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json', 'X-View-Token': token },
  });

  return {
    verify:     () => client.get<{ valid: boolean }>('/viewer/verify').then((r) => r.data),
    getSummary: () => client.get<ViewerSummary>('/viewer/summary').then((r) => r.data),
    getPosts:   (page = 1) => client.get<ViewerPostFeed>(`/viewer/posts?page=${page}&limit=30`).then((r) => r.data),
    getQueue:   () => client.get<{ reviews: ViewerQueueItem[] }>('/viewer/queue').then((r) => r.data),
    getAlerts:  () => client.get<{ alerts: ViewerAlert[] }>('/viewer/alerts').then((r) => r.data),
  };
}
