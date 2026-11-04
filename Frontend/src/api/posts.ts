import { api } from './client';
import type { Paginated, Post, PostPlatform, PostLanguage } from '../types/api';

export const postsApi = {
  list: (params: {
    page?:     number;
    limit?:    number;
    platform?: PostPlatform;
    language?: PostLanguage;
    label?:    string;
    search?:   string;
    labeled?:  boolean;
  }) => api.get<Paginated<Post>>('/posts', { params }).then((r) => r.data),

  ingest: (body: {
    content:      string;
    platform:     PostPlatform;
    language:     PostLanguage;
    externalId?:  string;
  }) => api.post<{ message: string; postId: string }>('/posts', body).then((r) => r.data),

  archive: (id: string) =>
    api.patch<Post>(`/posts/${id}/archive`).then((r) => r.data),
};
