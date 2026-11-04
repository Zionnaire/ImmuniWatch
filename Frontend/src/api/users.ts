import { api } from './client';
import type { User, UserRole } from '../types/api';

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),

  get: (id: string) => api.get<User>(`/users/${id}`).then((r) => r.data),

  invite: (body: { name: string; email: string; role: UserRole; organizationId?: string }) =>
    api.post<{ user: User; inviteLink: string; expiresAt: string }>('/users', body).then((r) => r.data),

  update: (id: string, body: { name?: string; role?: UserRole; active?: boolean }) =>
    api.patch<User>(`/users/${id}`, body).then((r) => r.data),

  resetPassword: (id: string, password: string) =>
    api.patch<{ message: string; userId: string }>(`/users/${id}/reset-password`, { password }).then((r) => r.data),

  delete: (id: string) =>
    api.delete<{ message: string; userId: string }>(`/users/${id}`).then((r) => r.data),

  feedbackStats: (id: string) =>
    api.get<{ overrides: number; rejections: number; total: number; lastContributedAt: string | null }>(
      `/users/${id}/feedback-stats`,
    ).then((r) => r.data),
};
