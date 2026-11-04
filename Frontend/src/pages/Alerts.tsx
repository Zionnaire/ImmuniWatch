import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Zap, Bell } from 'lucide-react';
import { alertsApi } from '../api/alerts';
import { SeverityBadge } from '../components/Badge';
import { FullPageSpinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatDateTime } from '../lib/utils';
import { useViewerMode } from '../context/ViewerModeContext';
import type { Alert } from '../types/api';

const PAGE_SIZE = 20;

const SEVERITY_ACCENT: Record<string, { dot: string; bg: string }> = {
  high:   { dot: '#c0392b', bg: 'rgba(192,57,43,0.08)'  },
  medium: { dot: '#d97706', bg: 'rgba(217,119,6,0.06)'  },
  low:    { dot: '#059669', bg: 'rgba(5,150,105,0.06)'   },
  info:   { dot: '#2563eb', bg: 'rgba(37,99,235,0.06)'   },
};

export default function Alerts() {
  const qc           = useQueryClient();
  const isViewerMode = useViewerMode();
  const [page, setPage] = useState(1);
  const [resolved, setResolved] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['alerts', { page, resolved }],
    queryFn: () => alertsApi.list({ page, limit: PAGE_SIZE, resolved }),
    placeholderData: (prev) => prev,
  });

  const { mutate: resolve } = useMutation({
    mutationFn: (id: string) => alertsApi.resolve(id),
    onSuccess: () => { setResolveError(''); void qc.invalidateQueries({ queryKey: ['alerts'] }); },
    onError:   () => setResolveError('Failed to resolve alert. Please try again.'),
  });

  const alerts: Alert[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(192,57,43,0.10)' }}>
              <Zap style={{ width: '16px', height: '16px', color: '#c0392b' }} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.01em' }}>
                Alert Command Center
              </h1>
              {!resolved && total > 0 && (
                <span className="text-sm font-semibold px-2.5 py-0.5 rounded-xl" style={{ background: 'rgba(192,57,43,0.10)', color: '#c0392b' }}>
                  {total}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm pl-10" style={{ color: '#4a6060' }}>
            Surveillance alerts, threshold breaches, and system notifications
          </p>
        </div>
      </div>

      {isError    && <ErrorBanner message="Failed to load alerts." />}
      {resolveError && <ErrorBanner message={resolveError} />}

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[
          { key: false, label: 'Open Alerts' },
          { key: true,  label: 'Resolved' },
        ].map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => { setResolved(key); setPage(1); }}
            className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
            style={resolved === key
              ? { background: '#0d3d3d', color: '#fff' }
              : { background: 'transparent', border: '1px solid rgba(13,61,61,0.18)', color: '#4a6060' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {isLoading ? (
        <FullPageSpinner />
      ) : alerts.length === 0 ? (
        <div className="glass-card p-10">
          <EmptyState
            title={resolved ? 'No resolved alerts' : 'No open alerts'}
            description="All surveillance channels clear."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const accent = SEVERITY_ACCENT[alert.severity] ?? SEVERITY_ACCENT.info;
            return (
              <div
                key={alert._id}
                className={`severity-${alert.severity} glass-card px-5 py-4 flex items-start gap-4 transition-all duration-150`}
              >
                {/* Severity dot */}
                <div className="flex-shrink-0 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full block"
                    style={{ background: accent.dot }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SeverityBadge severity={alert.severity} />
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg capitalize"
                      style={{ background: 'rgba(13,61,61,0.07)', color: '#4a6060' }}
                    >
                      {alert.triggerType.replace(/_/g, ' ')}
                    </span>
                    {alert.isResolved && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-lg"
                        style={{ background: 'rgba(0,137,123,0.08)', color: '#005048', border: '1px solid rgba(0,137,123,0.16)' }}
                      >
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#0f2626' }}>{alert.title}</p>
                  <p className="text-sm leading-snug" style={{ color: '#4a6060' }}>{alert.message}</p>
                  <p className="text-[11px] mt-1.5 tabular-nums" style={{ color: '#8da8a8' }}>
                    {formatDateTime(alert.createdAt)}
                  </p>
                </div>

                {/* Resolve action — hidden in viewer mode */}
                {!alert.isResolved && !isViewerMode && (
                  <button
                    onClick={() => resolve(alert._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl flex-shrink-0 transition-colors"
                    style={{ background: 'rgba(0,137,123,0.08)', border: '1px solid rgba(0,137,123,0.20)', color: '#005048' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,137,123,0.14)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,137,123,0.08)'; }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Resolve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="glass-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" style={{ color: '#8da8a8' }} />
            <span className="text-xs" style={{ color: '#8da8a8' }}>
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="px-3 py-1.5 text-xs rounded-xl transition-colors disabled:opacity-40"
              style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="px-3 py-1.5 text-xs rounded-xl transition-colors disabled:opacity-40"
              style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
