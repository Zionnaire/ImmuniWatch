import { AlertCircle } from 'lucide-react';

export function ErrorBanner({ message = 'Something went wrong. Please try again.' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}
