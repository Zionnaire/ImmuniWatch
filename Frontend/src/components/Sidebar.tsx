import { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ClipboardCheck, Radio, Send,
  TrendingUp, BookOpen, Network, Activity,
  ScrollText, Users, Settings, ShieldCheck, LogOut, Bell,
  Building2, Globe, X, MapPin, Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useViewerMode } from '../context/ViewerModeContext';
import { hitlApi } from '../api/hitl';
import { ROLE_LABELS } from '../lib/utils';
import type { UserRole } from '../types/api';

interface NavItem {
  to:         string;
  label:      string;
  Icon:       React.ElementType;
  roles?:     UserRole[];
  hitlBadge?: boolean;
}

// ── Platform nav (super_admin) ────────────────────────────────────────────────

const PLATFORM_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Management',
    items: [
      { to: '/organizations',     label: 'Organizations',     Icon: Building2 },
      { to: '/platform/overview', label: 'Platform Overview', Icon: Globe },
    ],
  },
  {
    label: 'Platform Health',
    items: [
      { to: '/users',     label: 'All Users',         Icon: Users },
      { to: '/audit-log', label: 'User Audit',        Icon: ScrollText },
      { to: '/settings',  label: 'Platform Settings', Icon: Settings },
    ],
  },
];

// ── Org nav (health center users) ─────────────────────────────────────────────

const ORG_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Monitor',
    items: [
      { to: '/dashboard',  label: 'Overview',          Icon: LayoutDashboard },
      { to: '/hitl',       label: 'HITL Review',       Icon: ClipboardCheck, hitlBadge: true },
      { to: '/posts',      label: 'Live Post Feed',    Icon: Radio },
      { to: '/dispatch',   label: 'Response Dispatch', Icon: Send,
        roles: ['senior_analyst', 'supervisor', 'org_admin'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/trends',         label: 'Trend Analysis',     Icon: TrendingUp,
        roles: ['senior_analyst', 'supervisor', 'org_admin'] },
      { to: '/knowledge-base', label: 'Knowledge Base',          Icon: BookOpen },
      { to: '/geo-surge',      label: 'Surge Coordinator',       Icon: MapPin,
        roles: ['supervisor', 'org_admin'] },
      { to: '/model-health',   label: 'Model Health',            Icon: Activity,
        roles: ['supervisor', 'org_admin'] },
      { to: '/ingestion',      label: 'Ingestion Pipeline',      Icon: Network,
        roles: ['org_admin'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/alerts',    label: 'Alerts',          Icon: Bell,
        roles: ['supervisor', 'org_admin'] },
      { to: '/audit-log', label: 'Audit Log',       Icon: ScrollText,
        roles: ['supervisor', 'org_admin'] },
      { to: '/users',     label: 'User Management', Icon: Users,
        roles: ['supervisor', 'org_admin'] },
      { to: '/settings',  label: 'Settings',        Icon: Settings,
        roles: ['supervisor', 'org_admin'] },
    ],
  },
];

interface SidebarProps {
  open:    boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const isViewerMode     = useViewerMode();
  const isSuperAdmin     = user?.role === 'super_admin';
  const navSections      = isSuperAdmin ? PLATFORM_NAV : ORG_NAV;

  useEffect(() => { onClose(); }, [location.pathname]); // eslint-disable-line

  const { data: hitlData } = useQuery({
    queryKey: ['hitl', 'pending-count'],
    queryFn:  () => hitlApi.list({ page: 1, limit: 1, status: 'pending' }),
    refetchInterval: 60_000,
    staleTime:       30_000,
    enabled: !isSuperAdmin,
  });
  const pendingCount = hitlData?.total ?? 0;

  const initials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  const sidebarContent = (
    <aside className="flex flex-col h-full sidebar-primary scrollbar-thin overflow-y-auto">

      {/* ── Logo bar ── */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/" className="flex items-center gap-3 flex-1 min-w-0 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(167,243,208,0.22) 0%, rgba(167,243,208,0.10) 100%)', border: '1px solid rgba(167,243,208,0.18)' }}>
            <ShieldCheck className="text-white" style={{ width: '18px', height: '18px' }} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-bold text-white tracking-wide" style={{ letterSpacing: '0.01em' }}>ImmuniWatch</div>
            <div className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '0.04em' }}>
              {isSuperAdmin ? 'PLATFORM ADMIN' : 'VITAL INTEL SUITE'}
            </div>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden ml-auto p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Org context strip ── */}
      {!isSuperAdmin && user?.organization?.name && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(167,243,208,0.07)', border: '1px solid rgba(167,243,208,0.12)' }}>
          <p className="text-[10px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Organization</p>
          <p className="text-xs font-medium text-white truncate mt-0.5">{user.organization.name}</p>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4">
        {navSections.map((section) => {
          const visible = section.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role)),
          );
          if (visible.length === 0) return null;
          return (
            <div key={section.label} className="mb-5">
              <div
                className="px-3 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.10em]"
                style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'rgba(255,255,255,0.30)' }}
              >
                {section.label}
              </div>
              {visible.map(({ to, label, Icon, hitlBadge }) => (
                <NavLink
                  key={to}
                  to={isViewerMode ? to.slice(1) : to}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 group"
                  style={({ isActive }) => isActive
                    ? { background: 'rgba(167,243,208,0.13)', color: '#ffffff', boxShadow: 'inset 0 0 0 1px rgba(167,243,208,0.12)' }
                    : { color: 'rgba(255,255,255,0.55)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                        style={{
                          background: isActive ? 'rgba(167,243,208,0.16)' : 'transparent',
                        }}>
                        <Icon style={{ width: '15px', height: '15px', color: isActive ? '#a7f3d0' : 'rgba(255,255,255,0.50)' }} />
                      </div>
                      <span className="flex-1 text-[13px] leading-none font-medium">{label}</span>
                      {hitlBadge && pendingCount > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: '#c0392b', color: '#ffffff' }}
                        >
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 mb-3 px-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(167,243,208,0.25) 0%, rgba(167,243,208,0.12) 100%)', color: '#a7f3d0', border: '1px solid rgba(167,243,208,0.20)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] truncate leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.40)', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {user ? ROLE_LABELS[user.role] : ''}
            </p>
          </div>
        </div>
        {isViewerMode ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(167,243,208,0.07)', border: '1px solid rgba(167,243,208,0.12)' }}>
            <Eye style={{ width: '14px', height: '14px', color: '#a7f3d0', flexShrink: 0 }} />
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(167,243,208,0.70)', fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '0.03em' }}>
              SECURE VIEW-ONLY ACCESS
            </span>
          </div>
        ) : (
          <button
            onClick={() => { void logout(); }}
            className="flex items-center gap-2 w-full text-xs font-medium transition-all rounded-lg px-3 py-2"
            style={{ color: 'rgba(255,255,255,0.40)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.40)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <LogOut style={{ width: '14px', height: '14px' }} />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible md+ */}
      <div className="hidden md:flex md:flex-col md:flex-shrink-0" style={{ width: '260px', minHeight: '100vh' }}>
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 z-50 shadow-xl animate-slide-in" style={{ width: '280px' }}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
