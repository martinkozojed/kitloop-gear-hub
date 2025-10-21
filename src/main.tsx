import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

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
