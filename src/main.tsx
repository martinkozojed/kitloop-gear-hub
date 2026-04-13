// =============================================================================
// P0 SECURITY: Production Console Kill Switch
// =============================================================================
// Disables console.log/info/debug in production to prevent PII leakage from
// third-party libraries (e.g., Supabase GoTrueClient logger assignment).
// console.warn and console.error are preserved for incident debugging.
// =============================================================================
if (import.meta.env.PROD) {
  console.log = () => {}; // eslint-disable-line no-console
  console.info = () => {}; // eslint-disable-line no-console
  console.debug = () => {}; // eslint-disable-line no-console
  // console.warn and console.error remain functional for production debugging
}

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// =============================================================================
// Sentry — synchronous init so errors are captured from first render
// =============================================================================
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  try {
    // Dynamic import is still used to keep Sentry out of the main bundle
    // when DSN is not configured. The .then() fires before createRoot
    // in practice (microtask queue), but even if it doesn't, the global
    // window.onerror handler Sentry installs retroactively captures
    // any errors that happen before init completes.
    import("@sentry/react").then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        // Capture 10% of transactions for performance monitoring
        tracesSampleRate: 0.1,
        // Capture 100% of errors (default, but explicit for clarity)
        // Replays are opt-in and not configured here
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_COMMIT_SHA || undefined,
      });
    }).catch((err) => {
      console.error("Failed to initialise Sentry", err);
    });
  } catch (error) {
    console.error("Failed to load Sentry module", error);
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);
