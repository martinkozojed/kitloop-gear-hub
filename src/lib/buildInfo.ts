export type BuildInfo = {
  shortCommit: string;
  buildTime: string;
};

const formatBuildTime = (value?: string): string => {
  if (!value) return "unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  // Format as YYYY-MM-DD HH:MM
  return date.toISOString().slice(0, 16).replace("T", " ");
};

export const getBuildInfo = (): BuildInfo => {
  const commit = (import.meta.env.VITE_COMMIT_SHA as string | undefined) ?? "";
  const buildTimeRaw = import.meta.env.VITE_BUILD_TIME as string | undefined;

  const shortCommit =
    commit.trim().length > 0
      ? commit.trim().slice(0, 7)
      : import.meta.env.DEV
        ? "dev"
        : "unknown";

  const buildTime =
    buildTimeRaw && buildTimeRaw.trim().length > 0
      ? formatBuildTime(buildTimeRaw)
      : import.meta.env.DEV
        ? "dev"
        : "unknown";

  return { shortCommit, buildTime };
};
