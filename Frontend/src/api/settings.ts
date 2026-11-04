import { api } from './client';
import type { AppSettings, AppSettingsPatch } from '../types/api';

export const settingsApi = {
  get: () =>
    api.get<AppSettings>('/settings').then((r) => r.data),

  // AppSettingsPatch is Partial<AppSettings> with the read-only fields stripped,
  // so TypeScript catches any attempt to send systemInfo or updatedAt to the server.
  update: (patch: AppSettingsPatch) =>
    api.patch<AppSettings>('/settings', patch).then((r) => r.data),
};