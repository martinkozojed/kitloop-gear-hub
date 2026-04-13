import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Global ErrorBoundary — prevents the White Screen of Death.
 *
 * Catches unhandled React errors, shows a recovery UI,
 * and reports to Sentry when available.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to Sentry if initialized
    try {
      import('@sentry/react').then((Sentry) => {
        if (typeof Sentry.captureException === 'function') {
          Sentry.captureException(error, {
            extra: { componentStack: errorInfo.componentStack },
          });
        }
      }).catch(() => {
        // Sentry not available — already logged to console below
      });
    } catch {
      // Sentry import failed — swallow silently
    }

    // Always log to console.error (survives prod kill switch)
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-lg w-full space-y-6 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An unexpected error occurred. Your data is safe — try reloading the page.
            </p>
          </div>

          {/* Dev-only error details */}
          {isDev && this.state.error && (
            <div className="rounded-token-md border border-destructive/20 bg-destructive/5 p-4 text-left">
              <p className="text-xs font-mono text-destructive break-all">
                {this.state.error.name}: {this.state.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center rounded-token-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Go to homepage
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-token-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Reload page
            </button>
          </div>

          {/* Footer hint */}
          <p className="text-xs text-muted-foreground">
            If the problem persists, contact{' '}
            <a
              href="mailto:support@kitloop.cz"
              className="underline underline-offset-2 hover:text-foreground"
            >
              support@kitloop.cz
            </a>
          </p>
        </div>
      </div>
    );
  }
}
