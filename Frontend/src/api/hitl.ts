import { api } from './client';
import type { Paginated, HITLReview, HITLPriority, HITLStatus, ClassificationLabel, HITLMyStats, HITLTeamStats } from '../types/api';

export const hitlApi = {
  list: (params: {
    page?:      number;
    limit?:     number;
    priority?:  HITLPriority;
    status?:    HITLStatus;
    sortBy?:    string;
    sortOrder?: 'asc' | 'desc';
  }) =>
    api.get<Paginated<HITLReview>>('/hitl', { params }).then((r) => r.data),

  approve: (id: string) =>
    api.post<HITLReview>(`/hitl/${id}/approve`).then((r) => r.data),

  override: (id: string, body: { overrideLabel: ClassificationLabel; editedResponse?: string; reviewerNote?: string }) =>
    api.post<HITLReview>(`/hitl/${id}/override`, body).then((r) => r.data),

  reject: (id: string) =>
    api.post<HITLReview>(`/hitl/${id}/reject`).then((r) => r.data),

  queuePost: (postId: string, priority: 'standard' | 'high' = 'standard') =>
    api.post<HITLReview>('/hitl/queue', { postId, priority }).then((r) => r.data),

  myStats: () =>
    api.get<HITLMyStats>('/hitl/my-stats').then((r) => r.data),

  teamStats: () =>
    api.get<HITLTeamStats>('/hitl/team-stats').then((r) => r.data),
};