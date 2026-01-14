const required = ["VITE_COMMIT_SHA", "VITE_BUILD_TIME"];

const shouldEnforce =
  process.env.CI === "true" || process.env.VITE_REQUIRE_BUILD_META === "true";

if (!shouldEnforce) {
  process.exit(0);
}

// Auto-fill from Netlify/Git metadata if missing
if (!process.env.VITE_COMMIT_SHA || process.env.VITE_COMMIT_SHA.trim() === "") {
  const fromNetlify =
    process.env.COMMIT_SHA ||
    process.env.COMMIT_REF;
  if (fromNetlify && fromNetlify.trim() !== "") {
    process.env.VITE_COMMIT_SHA = fromNetlify.trim();
  }
}

if (!process.env.VITE_BUILD_TIME || process.env.VITE_BUILD_TIME.trim() === "") {
  process.env.VITE_BUILD_TIME = new Date().toISOString();
}

const missing = required.filter((key) => {
  const value = process.env[key];
  return !value || String(value).trim().length === 0;
});

if (missing.length > 0) {
  console.warn(
    `⚠️  [WARN] Build metadata missing for release build: ${missing.join(", ")}. ` +
    "This will show as 'unknown' in the UI. " +
    "Set them in CI/deploy (e.g. VITE_COMMIT_SHA=$(git rev-parse HEAD) and VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ))."
  );

  // Set defaults for missing values to avoid runtime issues
  // Note: changing process.env here only affects this script, not the parent Vite process 
  // unless we're careful, but Vite reads .env files mostly. 
  // Ideally, these should be set in the shell before calling vite.
  process.exit(0); // Do NOT fail the build
}
