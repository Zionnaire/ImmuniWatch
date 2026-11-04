import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, RefreshCw, Search, BookOpen, Zap, Database } from 'lucide-react';
import { kbApi } from '../api/kb';
import { StatCard } from '../components/StatCard';
import { FullPageSpinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../context/ToastContext';
import { useViewerMode } from '../context/ViewerModeContext';
import { formatDateTime, LANG_FLAGS } from '../lib/utils';
import type { KBDocument, PostLanguage } from '../types/api';

const PAGE_SIZE = 20;

// ── Upload modal ───────────────────────────────────────────────────────────────
function UploadModal({ onClose }: { onClose: () => void }) {
  const qc   = useQueryClient();
  const toast = useToast().toast;
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState<PostLanguage>('en');
  const [file, setFile] = useState<File | null>(null);
  const [immediate, setImmediate] = useState(false);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => kbApi.upload(file!, { title, source, language, immediate }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kb'] });
      toast.success('Document uploaded', immediate ? 'Indexing started immediately.' : 'Document queued for indexing.');
      onClose();
    },
  });

  const langs = Object.keys(LANG_FLAGS) as PostLanguage[];

  const inputStyle: React.CSSProperties = {
    border: '1px solid rgba(13,61,61,0.15)', background: 'rgba(255,255,255,0.9)',
    color: '#0f2626', borderRadius: '12px', padding: '10px 12px', fontSize: '14px',
    width: '100%', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px',
    color: '#4a6060', fontFamily: '"Plus Jakarta Sans", sans-serif',
    letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  return (
    <div className="space-y-4">
      <div>
        <label style={labelStyle}>Document Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. WHO COVID-19 Vaccine FAQ" />
      </div>
      <div>
        <label style={labelStyle}>Source / Organization</label>
        <input value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle} placeholder="e.g. WHO, NCDC" />
      </div>
      <div>
        <label style={labelStyle}>Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value as PostLanguage)} style={inputStyle}>
          {langs.map((l) => <option key={l} value={l}>{LANG_FLAGS[l]} {l.toUpperCase()}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>File (PDF, DOCX, TXT)</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:text-xs file:font-semibold cursor-pointer"
          style={{ color: '#4a6060' }}
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#0f2626' }}>
        <input type="checkbox" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} className="rounded" />
        Process immediately (index now)
      </label>

      {isError && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.18)', color: '#c0392b' }}>
          Upload failed. Please check the file and try again.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl" style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}>
          Cancel
        </button>
        <button
          onClick={() => mutate()}
          disabled={isPending || !file || !title || !source}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          {isPending ? 'Uploading…' : 'Upload Document'}
        </button>
      </div>
    </div>
  );
}

// ── Doc status chip ────────────────────────────────────────────────────────────
function DocStatusChip({ status }: { status: string | undefined }) {
  if (status === 'ready') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,137,123,0.10)', color: '#005048', border: '1px solid rgba(0,137,123,0.18)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00897b' }} />
      Indexed
    </span>
  );
  if (status === 'processing') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(37,99,235,0.08)', color: '#1e40af', border: '1px solid rgba(37,99,235,0.16)' }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#5BA4CF' }} />
      Indexing…
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(217,119,6,0.08)', color: '#b45309', border: '1px solid rgba(217,119,6,0.16)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d97706' }} />
      Not synced
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function KnowledgeBase() {
  const qc           = useQueryClient();
  const toast        = useToast().toast;
  const isViewerMode = useViewerMode();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['kb', { page, search }],
    queryFn: () => kbApi.list({ page, limit: PAGE_SIZE, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const { mutate: deleteDoc } = useMutation({
    mutationFn: (id: string) => kbApi.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['kb'] }); toast.success('Document deleted'); },
    onError: () => toast.error('Delete failed', 'Could not remove the document. Please try again.'),
  });

  const { mutate: reindex, isPending: reindexing } = useMutation({
    mutationFn: () => kbApi.reindex(),
    onSuccess: (result: unknown) => {
      void qc.invalidateQueries({ queryKey: ['kb'] });
      const r = result as { processed?: number; mlSynced?: number; total?: number } | undefined;
      toast.success('Reindex complete', r ? `${r.processed ?? 0} embedded · ${r.mlSynced ?? 0} synced to ML ChromaDB · ${r.total ?? 0} total` : 'All documents re-indexed and synced to ML.');
    },
    onError: () => toast.error('Reindex failed', 'Please try again in a moment.'),
  });

  const docs: KBDocument[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const indexedCount  = docs.filter((d) => d.status === 'ready').length;
  const pendingCount  = docs.filter((d) => d.status === 'processing').length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,137,123,0.12)' }}>
              <BookOpen style={{ width: '16px', height: '16px', color: '#00897b' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.01em' }}>
              Knowledge Base
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: '#4a6060' }}>
            Verified fact-check documents, advisories, and health guidelines
          </p>
        </div>
        {!isViewerMode && (
          <div className="flex gap-2">
            <button
              onClick={() => reindex()}
              disabled={reindexing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
              style={{ border: '1px solid rgba(13,61,61,0.18)', color: '#4a6060', background: 'transparent' }}
            >
              <RefreshCw className={`h-4 w-4 ${reindexing ? 'animate-spin' : ''}`} />
              Reindex All
            </button>
            <button onClick={() => setUploadOpen(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
              <Upload className="h-4 w-4" /> Upload
            </button>
          </div>
        )}
      </div>

      {isError && <ErrorBanner message="Failed to load documents." />}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={total.toLocaleString()} icon={Database} color="teal" />
        <StatCard label="Indexed & Ready" value={indexedCount.toLocaleString()} icon={BookOpen} color="ocean" sub="Available for retrieval" />
        <StatCard label="Processing" value={pendingCount.toLocaleString()} icon={Zap} color="peach" />
        <StatCard label="Avg Retrieval" value="<42ms" icon={Zap} color="mauve" sub="Vector search latency" />
      </div>

      {/* Search bar */}
      <div className="glass-card p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
          className="flex gap-3 items-center"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8da8a8' }} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search documents by title or content…"
              className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl focus:outline-none"
              style={{ border: '1px solid rgba(13,61,61,0.15)', background: 'rgba(255,255,255,0.85)', color: '#0f2626' }}
            />
          </div>
          <button type="submit" className="btn-primary px-4 py-2.5 text-sm">Search</button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="text-xs rounded-lg px-3 py-2.5"
              style={{ border: '1px solid rgba(13,61,61,0.15)', color: '#4a6060' }}
            >
              Clear
            </button>
          )}
        </form>
        {search && (
          <p className="mt-2 text-xs" style={{ color: '#8da8a8' }}>
            Results for &ldquo;<strong style={{ color: '#0f2626' }}>{search}</strong>&rdquo; — {total} documents
          </p>
        )}
      </div>

      {/* Document table */}
      {isLoading ? (
        <FullPageSpinner />
      ) : docs.length === 0 ? (
        <div className="glass-card p-10">
          <EmptyState
            title={search ? 'No documents match your search' : 'No documents yet'}
            description={search ? 'Try different keywords.' : 'Upload WHO guidelines, NCDC advisories, or fact-check articles.'}
            action={!search ? (
              <button onClick={() => setUploadOpen(true)} className="btn-primary px-4 py-2 text-sm mt-3">
                Upload first document
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[560px]">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Source</th>
                  <th>Lang</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <p className="font-semibold" style={{ color: '#0f2626' }}>{doc.title}</p>
                      {doc.chunkCount !== undefined && (
                        <p className="text-[11px] mt-0.5" style={{ color: '#8da8a8' }}>
                          {doc.chunkCount} chunks
                        </p>
                      )}
                    </td>
                    <td style={{ color: '#4a6060' }}>{doc.source}</td>
                    <td>
                      <span className="text-sm">{LANG_FLAGS[doc.language] ?? ''}</span>
                      <span className="text-[11px] ml-1" style={{ color: '#8da8a8' }}>{doc.language?.toUpperCase()}</span>
                    </td>
                    <td><DocStatusChip status={doc.status} /></td>
                    <td className="tabular-nums" style={{ color: '#8da8a8' }}>{formatDateTime(doc.createdAt)}</td>
                    <td>
                      {!isViewerMode && (
                        <button
                          onClick={() => deleteDoc(doc._id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#8da8a8' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#c0392b'; (e.currentTarget as HTMLElement).style.background = 'rgba(192,57,43,0.08)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8da8a8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Knowledge Base Document" size="md">
        <UploadModal onClose={() => setUploadOpen(false)} />
      </Modal>
    </div>
  );
}
