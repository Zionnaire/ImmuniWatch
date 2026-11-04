import { api } from './client';

export interface DispatchStats {
  dispatchedToday: number;
  avgResponseTimeMin: number;
  platformAcceptanceRate: number;
  byPlatform: Array<{ platform: string; count: number; acceptanceRate: number }>;
}

export interface DispatchRecord {
  _id: string;
  postId: string;
  platform: string;
  language: string;
  response: string;
  status: 'sent' | 'accepted' | 'rejected' | 'pending';
  dispatchedAt: string;
}

export interface CounterNarrativeResult {
  available:        boolean;
  postId:           string | null;
  source?:          'ml' | 'groq' | 'template';  // which service generated the content
  counterNarrative: string | null;  // same as short (legacy)
  short?:           string | null;  // ≤280 chars — pre-fill by default
  medium?:          string | null;  // ≤200 words
  long?:            string | null;  // ≤500 words
  sources?:         string[];
  platform:         string | null;
}

export const dispatchApi = {
  getStats: () =>
    api.get<DispatchStats>('/dispatch/stats').then((r) => r.data),

  list: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: DispatchRecord[]; total: number }>('/dispatch', { params }).then((r) => r.data),

  getCounterNarrative: (postId: string) =>
    api.get<CounterNarrativeResult>('/dispatch/counter-narrative', { params: { postId } }).then((r) => r.data),

  deployCounterNarrative: (postId: string, approvedText: string) =>
    api.post<{ success: boolean; message: string; platform: string | null }>(`/dispatch/counter-narrative/${postId}/deploy`, { approvedText }).then((r) => r.data),

  skipCounterNarrative: (postId: string) =>
    api.post<{ success: boolean; message: string }>(`/dispatch/counter-narrative/${postId}/skip`).then((r) => r.data),
};
