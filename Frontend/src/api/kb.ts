import { api } from './client';
import type { KBDocument, Paginated, PostLanguage } from '../types/api';

export const kbApi = {
  list: (params: { page?: number; limit?: number; search?: string; source?: string }) =>
    api.get<Paginated<KBDocument>>('/kb', { params }).then((r) => r.data),

  upload: (file: File, meta: { title: string; source: string; language: PostLanguage; immediate?: boolean }) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(meta).forEach(([k, v]) => form.append(k, String(v)));
    return api.post<KBDocument>('/kb', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },

  delete: (id: string) => api.delete(`/kb/${id}`),

  reindex: () => api.post<{ processed: number; failed: number; total: number }>('/kb/reindex').then((r) => r.data),
};
