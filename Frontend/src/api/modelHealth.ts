import { api } from './client';
import type { ModelMetrics, PipelineStatus } from '../types/api';

export const modelHealthApi = {
  getMetrics: () =>
    api.get<ModelMetrics>('/model-health').then((r) => r.data),

  getF1Trend: (days = 30) =>
    api.get<{ date: string; macroF1: number }[]>('/model-health/f1-trend', { params: { days } }).then((r) => r.data),

  getRetrainStatus: () =>
    api.get<{ startedAt?: string; runId?: string; status?: string }>('/model-health/retrain-status').then((r) => r.data),

  triggerRetrain: (reason?: string) =>
    api.post<{ status: string }>('/model-health/retrain', { reason }).then((r) => r.data),

  getRecentFeedback: (limit = 10) =>
    api.get<import('../types/api').FeedbackItem[]>('/model-health/recent-feedback', { params: { limit } }).then((r) => r.data),

  getPipelineStatus: () =>
    api.get<PipelineStatus>('/pipeline/status').then((r) => r.data),
};
