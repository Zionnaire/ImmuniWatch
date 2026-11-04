import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional fallback to render instead of the default error UI */
  fallback?: ReactNode;
  /** Scope label shown in the error card (e.g. "Dashboard", "HITL Queue") */
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where you'd send to Sentry
    console.error('[ErrorBoundary]', { error, componentStack: info.componentStack });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-1">
          {this.props.scope ? `${this.props.scope} crashed` : 'Something went wrong'}
        </p>
        <p className="text-xs text-gray-500 mb-4 max-w-xs">
          {this.state.error?.message ?? 'An unexpected error occurred. The rest of the app is unaffected.'}
        </p>
        <button
          onClick={this.reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }
}
