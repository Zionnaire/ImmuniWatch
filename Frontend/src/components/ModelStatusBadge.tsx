import type { PipelineStatus } from '../types/api';

const STATUS_STYLES: Record<PipelineStatus['status'], string> = {
  healthy:    'bg-green-100 text-green-700',
  degraded:   'bg-yellow-100 text-yellow-700',
  fallback:   'bg-orange-100 text-orange-700',
  retraining: 'bg-blue-100 text-blue-700',
  mock:       'bg-amber-100 text-amber-700',
};

const STATUS_LABELS: Record<PipelineStatus['status'], string> = {
  healthy:    'Healthy',
  degraded:   'Degraded',
  fallback:   'Fallback Mode',
  retraining: 'Retraining',
  mock:       'Mock Mode',
};

export function ModelStatusBadge({ status }: { status: PipelineStatus['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
