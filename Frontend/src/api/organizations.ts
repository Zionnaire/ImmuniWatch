import { api } from './client';
import type { Organization, OrgDetail, PlatformOverview, Paginated } from '../types/api';

export const orgsApi = {
  platformOverview: () =>
    api.get<PlatformOverview>('/organizations/platform-overview').then((r) => r.data),

  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get<Paginated<Organization>>('/organizations', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<OrgDetail>(`/organizations/${id}`).then((r) => r.data),

  create: (body: {
    name: string; description?: string; region: string; state: string;
    contactEmail: string; phoneNumber?: string; plan?: string;
  }) => api.post<Organization>('/organizations', body).then((r) => r.data),

  update: (id: string, body: Partial<{
    name: string; description: string; region: string; state: string;
    contactEmail: string; phoneNumber: string; plan: string; status: string;
  }>) => api.patch<Organization>(`/organizations/${id}`, body).then((r) => r.data),

  setStatus: (id: string, status: 'active' | 'suspended' | 'trial') =>
    api.patch<Organization>(`/organizations/${id}/status`, { status }).then((r) => r.data),

  getClaimLink: (orgId: string) =>
    api.get<{ adminClaimed: boolean; claimLink: string | null; claimTokenExpiresAt: string | null }>(`/organizations/${orgId}/claim-link`).then((r) => r.data),

  regenerateClaimLink: (orgId: string) =>
    api.post<{ claimLink: string; claimTokenExpiresAt: string }>(`/organizations/${orgId}/claim-link/regenerate`).then((r) => r.data),
};
