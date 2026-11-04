import { AlertTriangle } from 'lucide-react';

export function FallbackModeAlert() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-orange-800">ML service in fallback mode</p>
        <p className="text-xs text-orange-700 mt-0.5">
          The classification model is unavailable. Posts are being queued for manual HITL review.
          Automatic classification will resume when the service recovers.
        </p>
      </div>
    </div>
  );
}
