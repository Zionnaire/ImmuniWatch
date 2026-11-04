import {
  createContext,
  use,
  useCallback,
  useReducer,
  type ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  type:     ToastType;
  title:    string;
  message?: string;
  duration: number;  // ms; 0 = sticky
}

type Action =
  | { type: 'ADD';    toast: Toast }
  | { type: 'REMOVE'; id: string };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD':    return [...state, action.toast];
    case 'REMOVE': return state.filter((t) => t.id !== action.id);
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts:  Toast[];
  dismiss: (id: string) => void;
  toast:   {
    success: (title: string, message?: string, duration?: number) => void;
    error:   (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info:    (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'ADD', toast: { id, type, title, message, duration } });
    if (duration > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
    }
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) => add('success', title, message, duration),
    error:   (title: string, message?: string, duration?: number) => add('error',   title, message, duration ?? 6000),
    warning: (title: string, message?: string, duration?: number) => add('warning', title, message, duration),
    info:    (title: string, message?: string, duration?: number) => add('info',    title, message, duration),
  };

  return (
    <ToastContext value={{ toasts, dismiss, toast }}>
      {children}
    </ToastContext>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
