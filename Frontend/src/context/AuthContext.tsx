import { createContext, use, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { AuthUser } from '../types/api';

interface AuthContextValue {
  user:          AuthUser | null;
  isLoading:     boolean;
  isDeactivated: boolean;
  login:         (email: string, password: string) => Promise<void>;
  logout:        () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isDeactivatedError(err: unknown): boolean {
  return (
    (err as { response?: { data?: { code?: string } } })?.response?.data?.code ===
    'ACCOUNT_DEACTIVATED'
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,          setUser]         = useState<AuthUser | null>(null);
  const [isLoading,     setLoading]      = useState(true);
  const [isDeactivated, setDeactivated]  = useState(false);

  // On mount — restore session from the HttpOnly cookie via /auth/me
  useEffect(() => {
    authApi.me()
      .then((u) => { setUser(u); setDeactivated(false); })
      .catch((err) => {
        setUser(null);
        if (isDeactivatedError(err)) setDeactivated(true);
        else setDeactivated(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Step 1: Authenticate — this sets the HttpOnly cookies on the backend
      await authApi.login(email, password);

      // Step 2: Immediately verify the session by calling me().
      // This confirms the cookies were received and are being sent correctly
      // (critical for cross-origin production deployments).
      // me() also returns the FULL user object including organization context.
      const fullUser = await authApi.me();
      setUser(fullUser);
      setDeactivated(false);
    } catch (err) {
      if (isDeactivatedError(err)) {
        setDeactivated(true);
        setUser(null);
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    setUser(null);
    setDeactivated(false);
  }, []);

  return (
    <AuthContext value={{ user, isLoading, isDeactivated, login, logout }}>
      {children}
    </AuthContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useIsSuperAdmin() { return useAuth().user?.role === 'super_admin'; }
export function useIsOrgAdmin()   { return useAuth().user?.role === 'org_admin'; }
export function useIsManager()    {
  const role = useAuth().user?.role;
  return role === 'org_admin' || role === 'supervisor' || role === 'super_admin';
}

// Fake auth provider for the read-only investor viewer — provides an org_admin
// user context without making any real auth API calls.
const VIEWER_USER: AuthUser = {
  id:             'viewer-token',
  name:           'Secure Viewer',
  email:          '',
  role:           'org_admin',
  organizationId: null,
  organization:   null,
};

export function ViewerAuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user:          VIEWER_USER,
    isLoading:     false,
    isDeactivated: false,
    login:         async () => { /* read-only */ },
    logout:        async () => { window.location.href = '/'; },
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}
