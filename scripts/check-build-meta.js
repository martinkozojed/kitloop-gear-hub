const required = ["VITE_COMMIT_SHA", "VITE_BUILD_TIME"];

const shouldEnforce =
  process.env.CI === "true" || process.env.VITE_REQUIRE_BUILD_META === "true";

if (!shouldEnforce) {
  process.exit(0);
}

const missing = required.filter((key) => {
  const value = process.env[key];
  return !value || String(value).trim().length === 0;
});

if (missing.length > 0) {
  console.error(
    `Build metadata missing for release build: ${missing.join(", ")}. ` +
      "Set them in CI/deploy (e.g. VITE_COMMIT_SHA=$(git rev-parse HEAD) and VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ))."
  );
  process.exit(1);
}
