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
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

if (import.meta.env.PROD) {
  import("virtual:pwa-register").then((m) => {
    const registerSW = m.registerSW ?? m.default;
    if (typeof registerSW === "function") registerSW({ immediate: true });
  });
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  (async () => {
    try {
      const Sentry = await import("@sentry/react");
      Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 0,
      });
    } catch (error) {
      console.error("Failed to initialise Sentry", error);
    }
  })();
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <App />
  </ThemeProvider>
);
