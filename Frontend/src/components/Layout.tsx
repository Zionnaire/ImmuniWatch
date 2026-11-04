import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, Menu, Home, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { alertsApi } from '../api/alerts';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { useViewerMode } from '../context/ViewerModeContext';
import type { Alert, AlertTriggerType } from '../types/api';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Analyst Intelligence Hub',
  '/hitl':              'HITL Review Queue',
  '/posts':             'Live Post Feed',
  '/dispatch':          'Response Dispatch',
  '/trends':            'Trend Analysis',
  '/knowledge-base':    'Knowledge Base',
  '/ingestion':         'Ingestion Pipeline',
  '/model-health':      'Model Health & Training',
  '/audit-log':         'System Audit Log',
  '/users':             'User & Access Control',
  '/settings':          'Platform Settings',
  '/alerts':            'Alerts',
  '/organizations':     'Organizations',
  '/platform/overview': 'Surveillance Command',
  '/geo-surge':         'Geospatial Surge Coordinator',
};

const TRIGGER_ROUTE: Record<AlertTriggerType, string> = {
  surge:           '/geo-surge',
  psi_drift:       '/model-health',
  model_update:    '/model-health',
  connector_error: '/ingestion',
  override_rate:   '/audit-log',
};

const SEVERITY_COLOR: Record<string, string> = {
  high:   '#c0392b',
  medium: '#d97706',
  low:    '#00897b',
  info:   '#5BA4CF',
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Layout() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const isViewerMode = useViewerMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [readIds,     setReadIds]     = useState<Set<string>>(() => new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  useEffect(() => { setNotifOpen(false); }, [location.pathname]);

  // In viewer mode the path is /view/:token/<page> — strip the prefix to look up the title.
  const pagePath = isViewerMode
    ? '/' + location.pathname.split('/').slice(3).join('/')
    : location.pathname;
  const title = PAGE_TITLES[pagePath] ?? 'Overview';

  const { data: liveStats } = useQuery({
    queryKey: ['stats', 'live'],
    queryFn:  () => api.get<{ postsLastHour: number; pendingHITL: number }>('/stats/live').then((r) => r.data),
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const { data: alertsPage } = useQuery({
    queryKey: ['notifications', 'live'],
    queryFn:  () => alertsApi.list({ page: 1, limit: 10, resolved: false }),
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const notifications: Alert[] = alertsPage?.data ?? [];
  const unread = notifications.filter((n) => !readIds.has(n._id)).length;

  function handleNotifClick(alert: Alert) {
    setReadIds((prev) => new Set([...prev, alert._id]));
    setNotifOpen(false);
    const dest = TRIGGER_ROUTE[alert.triggerType] ?? '/alerts';
    navigate(isViewerMode ? dest.slice(1) : dest);
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n._id)));
  }

  return (
    <div className="flex h-screen app-bg overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Topbar ── */}
        <header className="glass-topbar flex items-center px-4 md:px-6 gap-3 flex-shrink-0 z-10" style={{ height: '64px' }}>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-md transition-colors flex-shrink-0"
            style={{ color: '#404848' }}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-sm font-semibold truncate" style={{ fontFamily: 'Manrope, sans-serif', color: '#1a1c1c' }}>
              {title}
            </span>
          </div>

          {/* Live indicator */}
          <div
            className="hidden sm:flex items-center gap-2 flex-shrink-0 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,107,95,0.08)', border: '1px solid rgba(0,107,95,0.15)' }}
          >
            <span className="relative flex" style={{ width: '8px', height: '8px' }}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#00897b' }} />
              <span className="relative inline-flex rounded-full h-full w-full" style={{ background: '#00897b' }} />
            </span>
            <span className="text-xs font-semibold" style={{ color: '#00897b', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {liveStats ? `${liveStats.postsLastHour.toLocaleString()} / hr` : 'Live'}
            </span>
          </div>

          {/* Home link */}
          <Link
            to="/"
            title="Landing page"
            className="hidden sm:flex w-9 h-9 rounded-md items-center justify-center transition-colors flex-shrink-0"
            style={{ color: '#707978' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f4f3f2'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Home style={{ width: '16px', height: '16px' }} />
          </Link>

          {/* Notification bell */}
          <div className="relative flex-shrink-0" ref={panelRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative w-9 h-9 rounded-md flex items-center justify-center transition-colors"
              style={{ background: notifOpen ? '#f4f3f2' : 'transparent', color: '#404848' }}
              onMouseEnter={(e) => { if (!notifOpen) (e.currentTarget as HTMLElement).style.background = '#f4f3f2'; }}
              onMouseLeave={(e) => { if (!notifOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              aria-label="Notifications"
            >
              <Bell style={{ width: '18px', height: '18px' }} />
              {unread > 0 && (
                <span
                  className="absolute"
                  style={{
                    top: '6px', right: '6px', width: '8px', height: '8px',
                    borderRadius: '50%', background: '#ba1a1a', border: '2px solid #fff',
                  }}
                />
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 glass-dropdown animate-slide-in overflow-hidden"
                style={{ top: '52px', width: 'min(calc(100vw - 1rem), 22rem)', zIndex: 50 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #e9e8e7' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: '#1a1c1c' }}>Notifications</span>
                    {unread > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: '#ba1a1a', color: '#fff' }}>{unread}</span>
                    )}
                  </div>
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold"
                    style={{ color: '#00897b' }}
                  >
                    Mark all read
                  </button>
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm" style={{ color: '#707978' }}>No active alerts</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isRead = readIds.has(n._id);
                      return (
                        <div
                          key={n._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotifClick(n)}
                          onKeyDown={(e) => e.key === 'Enter' && handleNotifClick(n)}
                          className="flex gap-3 px-5 py-3.5 cursor-pointer"
                          style={{
                            borderBottom: '1px solid #f4f3f2',
                            background: isRead ? 'transparent' : 'rgba(0,107,95,0.04)',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f7f6f5'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isRead ? 'transparent' : 'rgba(0,107,95,0.04)'; }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: SEVERITY_COLOR[n.severity] ?? '#707978' }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium leading-snug" style={{ color: '#1a1c1c' }}>{n.title}</p>
                            <p className="text-[11px] leading-snug mt-0.5" style={{ color: '#404848', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {n.message}
                            </p>
                            <time className="text-[10px] mt-1 block" style={{ color: '#707978' }}>
                              {relTime(n.createdAt)}
                            </time>
                          </div>
                          <ChevronRight style={{ width: '14px', height: '14px', color: '#c9c8c7', flexShrink: 0, marginTop: '2px' }} />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-5 py-3 text-center text-[11px] font-semibold cursor-pointer transition-colors"
                  style={{ color: '#00897b', borderTop: '1px solid #e9e8e7' }}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setNotifOpen(false); navigate(isViewerMode ? 'alerts' : '/alerts'); }}
                  onKeyDown={(e) => e.key === 'Enter' && (setNotifOpen(false), navigate(isViewerMode ? 'alerts' : '/alerts'))}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#005048'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#00897b'; }}
                >
                  View all alerts →
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
          <ErrorBoundary scope={title}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
