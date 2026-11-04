import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// In dev the Vite proxy rewrites /api → /api/v1 on localhost:5000.
// In production VITE_API_URL must include the full path: https://host.onrender.com/api/v1
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// ── Viewer token injection ─────────────────────────────────────────────────────
let __viewerToken: string | null = null;
export function setViewerToken(t: string) { __viewerToken = t; }

api.interceptors.request.use((cfg) => {
  if (__viewerToken) cfg.headers['X-View-Token'] = __viewerToken;
  return cfg;
});

// ── Silent token refresh on 401 ───────────────────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

function drainQueue(err: Error | null) {
  pendingQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve()));
  pendingQueue = [];
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as RetryConfig | undefined;

    if (
      err.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login')
    ) {
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then(() => api(original))
        .catch((e: unknown) => Promise.reject(e instanceof Error ? e : new Error(String(e))));
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      drainQueue(null);
      return api(original);
    } catch (refreshErr: unknown) {
      const asError = refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr));
      drainQueue(asError);

      const code = (refreshErr as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const path  = window.location.pathname;

      // Public paths that should never be redirected to login — the page
      // handles unauthenticated state itself (invite / claim / deactivated pages).
      const PUBLIC_PREFIXES = ['/', '/accept-invite', '/claim-org', '/deactivated', '/submit', '/view'];
      const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

      if (code === 'ACCOUNT_DEACTIVATED') {
        window.location.href = '/deactivated';
      } else if (!isPublic && path !== '/login') {
        window.location.href = '/login';
      }
      // On public paths: just reject the promise — the component handles the error itself.
      return Promise.reject(asError);
    } finally {
      isRefreshing = false;
    }
  },
);
