import { api } from './client';
import type { LoginResponse, AuthUser } from '../types/api';

export interface InviteInfo {
  name:    string;
  email:   string;
  role:    string;
  orgName: string | null;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get<AuthUser>('/auth/me').then((r) => r.data),

  getInvite: (token: string) =>
    api.get<InviteInfo>(`/auth/invite/${token}`).then((r) => r.data),

  acceptInvite: (token: string, password: string) =>
    api.post<{ message: string; email: string }>('/auth/accept-invite', { token, password }).then((r) => r.data),

  getOrgClaim: (token: string) =>
    api.get<{ orgName: string; orgId: string; region: string; state: string }>(`/auth/claim-org/${token}`).then((r) => r.data),

  acceptOrgClaim: (body: { token: string; name: string; email: string; password: string }) =>
    api.post<{ message: string; email: string }>('/auth/claim-org', body).then((r) => r.data),
};
