type ChartColorToken =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6";

const FALLBACK_COLORS: Record<ChartColorToken, string> = {
  "chart-1": "#22c55e",
  "chart-2": "#0ea5e9",
  "chart-3": "#f97316",
  "chart-4": "#a855f7",
  "chart-5": "#f43f5e",
  "chart-6": "#14b8a6",
};

export function resolveChartColor(token: ChartColorToken): string {
  if (typeof window === "undefined") {
    return FALLBACK_COLORS[token];
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(
    `--${token}`
  );

  return value?.trim() || FALLBACK_COLORS[token];
}

export const chartPalette = [
  resolveChartColor("chart-1"),
  resolveChartColor("chart-2"),
  resolveChartColor("chart-3"),
  resolveChartColor("chart-4"),
  resolveChartColor("chart-5"),
  resolveChartColor("chart-6"),
];
