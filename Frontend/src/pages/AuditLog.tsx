import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Filter } from 'lucide-react';
import { api } from '../api/client';
import { FullPageSpinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatDateTime } from '../lib/utils';
import type { AuditEntry, Paginated } from '../types/api';

const PAGE_SIZE = 30;

function fetchAuditLog(params: { page: number; limit: number; resourceType?: string }) {
  return api.get<Paginated<AuditEntry>>('/audit', { params }).then((r) => r.data);
}

const RESOURCE_TYPES = [
  'Classification', 'HITLReview', 'KnowledgeBase', 'User', 'Alert', 'Post', 'ModelMetrics',
];

// Action chip color mapping
const ACTION_CHIP: Record<string, { bg: string; color: string }> = {
  create:   { bg: 'rgba(0,137,123,0.08)',  color: '#005048' },
  update:   { bg: 'rgba(91,164,207,0.10)', color: '#1a6fa0' },
  delete:   { bg: 'rgba(192,57,43,0.08)', color: '#c0392b'  },
  approve:  { bg: 'rgba(0,137,123,0.08)',  color: '#005048' },
  reject:   { bg: 'rgba(192,57,43,0.08)', color: '#c0392b'  },
  override: { bg: 'rgba(217,119,6,0.08)', color: '#b45309'  },
  dispatch: { bg: 'rgba(176,139,191,0.10)', color: '#7b4ea0' },
  login:    { bg: 'rgba(74,96,96,0.07)',   color: '#4a6060'  },
  logout:   { bg: 'rgba(74,96,96,0.07)',   color: '#4a6060'  },
  view:     { bg: 'rgba(74,96,96,0.06)',   color: '#8da8a8'  },
};

function ActionChip({ action }: { action: string }) {
  const verb  = action.split('_')[0] ?? action;
  const chip  = ACTION_CHIP[verb] ?? ACTION_CHIP.view;
  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-lg capitalize"
      style={{ background: chip.bg, color: chip.color }}
    >
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function AuditLog() {
  const [page, setPage]             = useState(1);
  const [resourceType, setResourceType] = useState('');

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['audit', { page, resourceType }],
    queryFn: () => fetchAuditLog({ page, limit: PAGE_SIZE, resourceType: resourceType || undefined }),
    placeholderData: (prev) => prev,
  });

  const entries: AuditEntry[] = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(91,164,207,0.12)' }}>
              <ScrollText style={{ width: '16px', height: '16px', color: '#5BA4CF' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.01em' }}>
              Compliance Log
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: '#4a6060' }}>
            Immutable record of all system actions — approvals, overrides, deletions, and role changes
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(91,164,207,0.10)', color: '#1a6fa0', border: '1px solid rgba(91,164,207,0.20)' }}
        >
          {total.toLocaleString()} entries
        </span>
      </div>

      {isError && <ErrorBanner message="Failed to load audit log." />}

      {/* Filter bar */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Filter className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#8da8a8' }} />
        <span className="label-caps text-[#4a6060]">Filter by type</span>
        <select
          value={resourceType}
          onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ border: '1px solid rgba(13,61,61,0.15)', background: 'rgba(255,255,255,0.85)', color: '#0f2626', minWidth: '160px' }}
        >
          <option value="">All resource types</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {resourceType && (
          <button
            onClick={() => { setResourceType(''); setPage(1); }}
            className="text-xs rounded-lg px-3 py-2"
            style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Audit table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8"><FullPageSpinner /></div>
        ) : entries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={resourceType ? `No entries for ${resourceType}` : 'No audit entries'}
              description="Actions are logged automatically as users interact with the system."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Resource ID</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const actorName = entry.actorName ?? (typeof entry.actor === 'string' ? entry.actor : entry.actor.name);
                    return (
                      <tr key={entry._id}>
                        <td>
                          <p className="font-semibold" style={{ color: '#0f2626' }}>{actorName}</p>
                          {entry.actorRole && (
                            <p className="text-[11px] capitalize mt-0.5" style={{ color: '#8da8a8' }}>{entry.actorRole.replace(/_/g, ' ')}</p>
                          )}
                        </td>
                        <td><ActionChip action={entry.action} /></td>
                        <td>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                            style={{ background: 'rgba(13,61,61,0.05)', color: '#4a6060', border: '1px solid rgba(13,61,61,0.08)' }}
                          >
                            {entry.resourceType}
                          </span>
                        </td>
                        <td>
                          <span className="text-[11px] font-mono" style={{ color: '#8da8a8' }}>
                            {entry.resourceId ? (entry.resourceId.length > 16 ? `${entry.resourceId.slice(0, 8)}…${entry.resourceId.slice(-4)}` : entry.resourceId) : '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap tabular-nums text-xs" style={{ color: '#8da8a8' }}>
                          {formatDateTime(entry.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(13,61,61,0.08)' }}>
                <span className="text-xs" style={{ color: '#8da8a8' }}>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="px-3 py-1.5 text-xs rounded-xl disabled:opacity-40 transition-colors"
                    style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}
                    className="px-3 py-1.5 text-xs rounded-xl disabled:opacity-40 transition-colors"
                    style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
