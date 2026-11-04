import { useQuery }          from '@tanstack/react-query';
import {
  Network, Wifi, AlertCircle, CheckCircle, Activity, WifiOff, Clock,
  Radio, ChevronRight,
} from 'lucide-react';
import { modelHealthApi }   from '../api/modelHealth';
import { pipelineApi }      from '../api/pipeline';
import type { Connector, KafkaHealth } from '../api/pipeline';
import { StatCard }          from '../components/StatCard';
import { FullPageSpinner }   from '../components/Spinner';
import { ErrorBanner }       from '../components/ErrorBanner';
import { LABEL_META, LANG_LABELS, PLATFORM_LABELS, formatRelative } from '../lib/utils';
import type { RecentPost }   from '../types/api';

// ── Status metadata ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { bg: string; color: string; border: string; Icon: React.ElementType; label: string }> = {
  active:         { bg: 'rgba(0,137,123,0.08)',  color: '#005048', border: 'rgba(0,137,123,0.18)',  Icon: CheckCircle, label: 'Active'         },
  degraded:       { bg: 'rgba(217,119,6,0.08)',  color: '#b45309', border: 'rgba(217,119,6,0.18)',  Icon: AlertCircle, label: 'Degraded'       },
  waiting:        { bg: 'rgba(37,99,235,0.08)',  color: '#1e40af', border: 'rgba(37,99,235,0.16)',  Icon: Clock,       label: 'Waiting'        },
  down:           { bg: 'rgba(192,57,43,0.08)',  color: '#c0392b', border: 'rgba(192,57,43,0.16)',  Icon: WifiOff,     label: 'Down'           },
  not_integrated: { bg: 'rgba(74,96,96,0.07)',   color: '#4a6060', border: 'rgba(74,96,96,0.14)',   Icon: WifiOff,     label: 'Not integrated' },
  mock:           { bg: 'rgba(217,119,6,0.08)',  color: '#b45309', border: 'rgba(217,119,6,0.18)',  Icon: AlertCircle, label: 'Mock'           },
};

const PIPELINE_STAGES = [
  { id: 1, label: 'Ingest',    desc: 'Platform connectors pull posts via APIs / webhooks' },
  { id: 2, label: 'Kafka',     desc: 'Events streamed through Kafka topics for dedup + buffering' },
  { id: 3, label: 'Classify',  desc: 'ML service assigns label + confidence score' },
  { id: 4, label: 'HITL Gate', desc: 'High-risk posts routed to human review queue' },
  { id: 5, label: 'Dispatch',  desc: 'Approved counter-narratives pushed to platforms' },
];

const PLATFORM_CHIP: Record<string, { bg: string; color: string }> = {
  bluesky:    { bg: 'rgba(91,164,207,0.12)',  color: '#1a6fa0' },
  youtube:    { bg: 'rgba(192,57,43,0.10)',   color: '#b03325' },
  twitter:    { bg: 'rgba(37,99,235,0.10)',   color: '#1e40af' },
  facebook:   { bg: 'rgba(0,137,123,0.10)',   color: '#005048' },
  instagram:  { bg: 'rgba(176,139,191,0.14)', color: '#7b4ea0' },
  submission: { bg: 'rgba(74,96,96,0.08)',    color: '#4a6060' },
};

// FIX: returns '—' for empty strings and invalid dates instead of 'NaNh ago'.
function formatRel(iso: string): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function IngestionPipeline() {
  const { data: pipeline, isLoading, isError } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn:  () => modelHealthApi.getPipelineStatus(),
    refetchInterval: 30_000,
  });

  const { data: connectors, isLoading: loadingConnectors } = useQuery<Connector[]>({
    queryKey: ['pipeline', 'connectors'],
    queryFn:  () => pipelineApi.getConnectors(),
    refetchInterval: 30_000,
  });

  const { data: kafka } = useQuery<KafkaHealth>({
    queryKey: ['pipeline', 'kafka'],
    queryFn:  () => pipelineApi.getKafkaHealth(),
    refetchInterval: 30_000,
  });

  const { data: recentFeed } = useQuery({
    queryKey: ['pipeline', 'recent'],
    queryFn:  () => pipelineApi.getRecentFeed(),
    refetchInterval: 60_000,
  });

  const activeConnectors = connectors?.filter((c) => c.status === 'active').length ?? 0;
  const totalConnectors  = connectors?.length ?? 0;
  const totalEPM         = connectors?.reduce((s, c) => s + c.eventsPerMin, 0) ?? 0;

  if (isLoading) return <FullPageSpinner />;

  const status       = pipeline?.status ?? 'unknown';
  const circuitState = pipeline?.mlService?.circuitState ?? 'CLOSED';
  const isHealthy    = status === 'healthy';
  const isDegraded   = status === 'degraded';
  const isFallback   = status === 'fallback';
  const isMock       = status === 'mock' || pipeline?.mockMode === true;
  const modelVersion = pipeline?.mlService?.modelVersion;

  // Stage pill color: infra stages (1-2) always deep emerald, ML stages use status color
  function stageStyle(id: number): React.CSSProperties {
    if (id <= 2 || isHealthy) return { background: '#0d3d3d', color: '#fff' };
    if (isFallback)           return { background: '#c0392b', color: '#fff' };
    if (isDegraded)           return { background: '#d97706', color: '#fff' };
    return { background: '#0d3d3d', color: '#fff' };
  }

  const statusChip = isHealthy
    ? { bg: 'rgba(0,137,123,0.10)', color: '#005048', border: 'rgba(0,137,123,0.20)', dot: '#00897b' }
    : isMock || isDegraded
    ? { bg: 'rgba(217,119,6,0.10)', color: '#b45309', border: 'rgba(217,119,6,0.20)', dot: '#d97706' }
    : isFallback
    ? { bg: 'rgba(192,57,43,0.10)', color: '#c0392b', border: 'rgba(192,57,43,0.20)', dot: '#c0392b' }
    : { bg: 'rgba(74,96,96,0.08)',  color: '#4a6060', border: 'rgba(74,96,96,0.16)',  dot: '#8da8a8' };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(91,164,207,0.12)' }}>
              <Network style={{ width: '16px', height: '16px', color: '#5BA4CF' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2626', fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.01em' }}>
              Live Intelligence Hub
            </h1>
          </div>
          <p className="text-sm pl-10" style={{ color: '#4a6060' }}>
            Platform connectors, pipeline stages, Kafka streaming, and live ML classification feed
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: statusChip.bg, color: statusChip.color, border: `1px solid ${statusChip.border}` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusChip.dot }} />
          {status}
        </span>
      </div>

      {isError && <ErrorBanner message="Failed to load pipeline status." />}

      {/* Status banners */}
      {isDegraded && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.18)' }}>
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d97706' }} />
          <div className="text-xs" style={{ color: '#b45309' }}>
            <strong>ML service waking up</strong> — the HuggingFace Space is cold-starting. The 2-second health probe timed out. This resolves in 15–30 seconds. Circuit breaker: <strong>{circuitState}</strong>
          </div>
        </div>
      )}
      {isFallback && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.18)' }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#c0392b' }} />
          <div className="text-xs" style={{ color: '#b03325' }}>
            <strong>Circuit breaker OPEN</strong> — ML service failed threshold. Posts still ingested; classifications queued to HITL for manual review. Breaker resets after 60 seconds.
          </div>
        </div>
      )}
      {isMock && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.18)' }}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d97706' }} />
          <p className="text-xs" style={{ color: '#b45309' }}>
            <strong>Mock mode active</strong> — ML_MOCK_MODE=true in .env. Set ML_MOCK_MODE=false and restart to use the live HuggingFace model.
          </p>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Connectors" value={`${activeConnectors} / ${totalConnectors}`} icon={Wifi}        color="teal"  />
        <StatCard label="Events / min"       value={totalEPM.toLocaleString()}                  icon={Activity}    color="ocean" />
        <StatCard label="Kafka Lag"          value={kafka ? `${kafka.kafkaLagMs}ms` : '—'}      icon={Network}     color="peach" />
        <StatCard label="Dedup Rate"         value={kafka ? `${(kafka.dedupRate * 100).toFixed(1)}%` : '—'} icon={CheckCircle} color="mauve" />
      </div>

      {/* Pipeline stage visualizer */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00897b' }} />
          <h2 className="label-caps text-[#4a6060]">Pipeline Stages</h2>
        </div>
        <div className="flex items-start overflow-x-auto pb-2 gap-0">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-start flex-shrink-0">
              <div className="flex flex-col items-center w-36">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm"
                  style={stageStyle(stage.id)}
                >
                  {stage.id}
                </div>
                <p className="text-xs font-semibold mt-2 text-center" style={{ color: '#0f2626' }}>{stage.label}</p>
                <p className="text-[10px] mt-1 text-center leading-snug max-w-[120px]" style={{ color: '#8da8a8' }}>{stage.desc}</p>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex-shrink-0 mt-4">
                  <ChevronRight className="h-4 w-4" style={{ color: 'rgba(13,61,61,0.25)' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Connectors + ML panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Connector status cards */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(13,61,61,0.08)' }}>
            <Wifi className="h-3.5 w-3.5" style={{ color: '#4a6060' }} />
            <h2 className="label-caps text-[#4a6060]">Connector Status</h2>
          </div>
          {loadingConnectors ? <div className="p-8"><FullPageSpinner /></div> : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th className="text-right">Ev/min</th>
                    <th className="text-right">Err%</th>
                    <th className="text-right">Last Event</th>
                  </tr>
                </thead>
                <tbody>
                  {(connectors ?? []).map((c) => {
                    const meta = STATUS_META[c.status] ?? STATUS_META.not_integrated;
                    return (
                      <tr key={c.platform}>
                        <td>
                          <p className="font-semibold" style={{ color: '#0f2626' }}>{c.name}</p>
                          {c.note && <p className="text-[10px] mt-0.5" style={{ color: '#8da8a8' }}>{c.note}</p>}
                        </td>
                        <td>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                          >
                            <meta.Icon className="h-3 w-3" /> {meta.label}
                          </span>
                        </td>
                        <td className="text-right tabular-nums" style={{ color: '#4a6060' }}>{c.eventsPerMin.toLocaleString()}</td>
                        <td className="text-right tabular-nums" style={{ color: '#4a6060' }}>{(c.errorRate * 100).toFixed(1)}%</td>
                        <td className="text-right tabular-nums" style={{ color: '#8da8a8' }}>{formatRel(c.lastEventAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Circuit breaker */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-3.5 w-3.5" style={{ color: '#4a6060' }} />
              <h2 className="label-caps text-[#4a6060]">ML Service Circuit Breaker</h2>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                style={{
                  background: circuitState === 'CLOSED' ? 'rgba(0,137,123,0.12)' : circuitState === 'HALF_OPEN' ? 'rgba(217,119,6,0.12)' : 'rgba(192,57,43,0.12)',
                  color:      circuitState === 'CLOSED' ? '#00897b'              : circuitState === 'HALF_OPEN' ? '#d97706'              : '#c0392b',
                  border:     `1px solid ${circuitState === 'CLOSED' ? 'rgba(0,137,123,0.20)' : circuitState === 'HALF_OPEN' ? 'rgba(217,119,6,0.20)' : 'rgba(192,57,43,0.20)'}`,
                }}
              >
                {circuitState === 'CLOSED' ? '●' : circuitState === 'HALF_OPEN' ? '◑' : '○'}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0f2626' }}>{circuitState}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a6060' }}>
                  {circuitState === 'CLOSED'    ? 'ML service healthy — all requests passing through'
                   : circuitState === 'HALF_OPEN' ? 'Probing — limited requests allowed to test recovery'
                   : 'Circuit open — fallback classifier active'}
                </p>
                {pipeline?.mlService && (
                  <p className="text-[11px] mt-1" style={{ color: '#8da8a8' }}>
                    Model: {modelVersion && modelVersion !== 'unknown' ? modelVersion : isDegraded ? '— (waking up)' : '—'}
                  </p>
                )}
                {pipeline?.mlService?.lastHealthError && (
                  <p className="text-[11px] mt-0.5 font-mono" style={{ color: '#d97706' }}>
                    {pipeline.mlService.lastHealthError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kafka topics */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(13,61,61,0.08)' }}>
              <Network className="h-3.5 w-3.5" style={{ color: '#4a6060' }} />
              <h2 className="label-caps text-[#4a6060]">Kafka Topics</h2>
            </div>
            {kafka?.enabled === false ? (
              <div className="px-5 py-5 text-center">
                <p className="text-xs font-semibold" style={{ color: '#4a6060' }}>Kafka disabled</p>
                <p className="text-[11px] mt-1" style={{ color: '#8da8a8' }}>Set KAFKA_ENABLED=true in .env to enable streaming.</p>
              </div>
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th className="text-right w-20">Partitions</th>
                    <th className="text-right w-24">Consumer Lag</th>
                  </tr>
                </thead>
                <tbody>
                  {(kafka?.topics ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-4" style={{ color: '#8da8a8' }}>No topics — Kafka connected but no topics produced yet.</td></tr>
                  ) : (kafka?.topics ?? []).map((t) => (
                    <tr key={t.name}>
                      <td className="font-mono text-[11px]" style={{ color: '#0f2626' }}>{t.name}</td>
                      <td className="text-right tabular-nums" style={{ color: '#4a6060' }}>{t.partitions}</td>
                      <td className="text-right">
                        <span className="tabular-nums font-semibold" style={{ color: t.lag > 1000 ? '#d97706' : '#4a6060' }}>
                          {t.lag.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Live ML Feed */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(13,61,61,0.08)' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#00897b' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00897b' }} />
            </span>
            <Radio className="h-3.5 w-3.5" style={{ color: '#00897b' }} />
            <h2 className="label-caps text-[#4a6060]">Live ML Feed</h2>
            <span className="text-[10px]" style={{ color: '#8da8a8' }}>All platforms · auto-classified 24/7</span>
          </div>
          {recentFeed && (
            <span className="text-[11px] tabular-nums" style={{ color: '#8da8a8' }}>
              {recentFeed.total_since_start.toLocaleString()} total since service start
            </span>
          )}
        </div>

        {!recentFeed ? (
          <div className="px-5 py-8 text-center text-xs" style={{ color: '#8da8a8' }}>Loading live feed…</div>
        ) : recentFeed.posts.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs" style={{ color: '#8da8a8' }}>No posts yet — feed will populate automatically.</div>
        ) : (
          <div style={{ borderTop: '1px solid rgba(13,61,61,0.04)' }}>
            {recentFeed.posts.slice(0, 20).map((post: RecentPost) => {
              const labelMeta = LABEL_META[post.label] ?? LABEL_META.irrelevant;
              const platChip  = PLATFORM_CHIP[post.platform] ?? { bg: 'rgba(74,96,96,0.08)', color: '#4a6060' };
              const lang      = post.language ? (LANG_LABELS[post.language] ?? post.language) : '—';
              const confPct   = Math.round(post.confidence * 100);

              return (
                <div
                  key={post.post_id}
                  className="flex items-start gap-3 px-5 py-3 transition-colors"
                  style={{ borderBottom: '1px solid rgba(13,61,61,0.04)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(13,61,61,0.025)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span
                    className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                    style={{ background: platChip.bg, color: platChip.color }}
                  >
                    {PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS] ?? post.platform}
                  </span>

                  <p className="flex-1 text-xs leading-relaxed min-w-0 line-clamp-2" style={{ color: '#0f2626' }}>
                    {post.content_snippet}
                  </p>

                  <div className="flex-shrink-0 flex items-center gap-2 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold ${labelMeta.color}`}>
                      {labelMeta.label}
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: confPct >= 85 ? '#c0392b' : confPct >= 70 ? '#d97706' : '#4a6060' }}>
                      {confPct}%
                    </span>
                    <span className="hidden sm:inline" style={{ color: '#8da8a8' }}>{lang}</span>
                    <span className="tabular-nums" style={{ color: '#8da8a8' }}>{formatRelative(post.classified_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
