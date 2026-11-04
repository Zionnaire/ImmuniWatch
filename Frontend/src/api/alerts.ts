import { api } from './client';
import type { Alert, AlertSeverity, Paginated } from '../types/api';

export const alertsApi = {
  list: (params: { page?: number; limit?: number; severity?: AlertSeverity; resolved?: boolean }) =>
    api.get<Paginated<Alert>>('/alerts', { params }).then((r) => r.data),

  resolve: (id: string) =>
    api.patch<Alert>(`/alerts/${id}/resolve`).then((r) => r.data),
};
