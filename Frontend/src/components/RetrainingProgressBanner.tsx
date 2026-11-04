import { RefreshCw } from 'lucide-react';

interface RetrainingProgressBannerProps {
  startedAt: string;
  runId?: string;
}

export function RetrainingProgressBanner({ startedAt, runId }: RetrainingProgressBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <RefreshCw className="h-5 w-5 text-blue-500 flex-shrink-0 animate-spin" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-800">Model retraining in progress</p>
        <p className="text-xs text-blue-700 mt-0.5">
          Started {new Date(startedAt).toLocaleString()}
          {runId && <span className="ml-2 font-mono text-blue-600">Run: {runId}</span>}
        </p>
      </div>
    </div>
  );
}
