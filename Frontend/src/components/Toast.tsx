import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '../context/ToastContext';

// ── Per-toast config ──────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, {
  icon:       React.FC<{ className?: string }>;
  container:  string;
  iconColor:  string;
  title:      string;
}> = {
  success: {
    icon:      CheckCircle,
    container: 'bg-white border-l-4 border-l-emerald-500 border border-gray-200',
    iconColor: 'text-[#00897b]',
    title:     'text-gray-800',
  },
  error: {
    icon:      AlertCircle,
    container: 'bg-white border-l-4 border-l-red-500 border border-gray-200',
    iconColor: 'text-red-500',
    title:     'text-gray-800',
  },
  warning: {
    icon:      AlertTriangle,
    container: 'bg-white border-l-4 border-l-amber-500 border border-gray-200',
    iconColor: 'text-amber-500',
    title:     'text-gray-800',
  },
  info: {
    icon:      Info,
    container: 'bg-white border-l-4 border-l-blue-500 border border-gray-200',
    iconColor: 'text-blue-500',
    title:     'text-gray-800',
  },
};

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const { icon: Icon, container, iconColor, title: titleColor } = CONFIG[toast.type];

  return (
    <div
      className={`flex items-start gap-3 w-80 rounded-xl shadow-lg px-4 py-3 ${container} animate-slide-in`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Toast stack ───────────────────────────────────────────────────────────────

export function ToastStack() {
  const { toasts } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
