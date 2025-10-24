import {
  AnalyticsPeriod,
  DateRange,
  RevenueQueryRange,
  RevenueTrendPoint,
} from "./types";

export function calculatePercentChange(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 1;
  }
  return (currentValue - previousValue) / Math.abs(previousValue);
}

export function sumCents(values: Array<number | null | undefined>): number {
  return values.reduce((sum, value) => {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return sum + Math.round(value);
    }
    return sum;
  }, 0);
}

export function determineChartBucket(range: DateRange): "day" | "week" | "month" {
  const diffMs = range.end.getTime() - range.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 31) return "day";
  if (diffDays <= 90) return "week";
  return "month";
}

export function normaliseTrendPoints(points: RevenueTrendPoint[]): RevenueTrendPoint[] {
  return points
    .reduce<RevenueTrendPoint[]>((acc, point) => {
      const existing = acc.find((entry) => entry.date === point.date);
      if (existing) {
        existing.totalCents += point.totalCents;
      } else {
        acc.push({ ...point });
      }
      return acc;
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function toDateRange(daysBack: number): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (daysBack - 1));
  return { start, end };
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

export function getCurrentMonthRange(reference = new Date()): DateRange {
  const start = startOfMonth(reference);
  const end = endOfMonth(reference);
  return { start, end };
}

export function getPreviousMonthRange(reference = new Date()): DateRange {
  const prevMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 15);
  return getCurrentMonthRange(prevMonth);
}

export function buildMonthlyComparison(reference = new Date()): RevenueQueryRange {
  return {
    current: getCurrentMonthRange(reference),
    previous: getPreviousMonthRange(reference),
  };
}

export function getLastNDaysRange(days: number): DateRange {
  return toDateRange(days);
}

function shiftRange(range: DateRange, days: number): DateRange {
  const start = new Date(range.start);
  start.setDate(start.getDate() + days);
  const end = new Date(range.end);
  end.setDate(end.getDate() + days);
  return { start, end };
}

export function buildComparisonForPeriod(
  period: AnalyticsPeriod,
  reference = new Date()
): RevenueQueryRange {
  if (period === "last7Days") {
    const current = getLastNDaysRange(7);
    const previous = shiftRange(current, -7);
    return { current, previous };
  }

  if (period === "last30Days") {
    const current = getLastNDaysRange(30);
    const previous = shiftRange(current, -30);
    return { current, previous };
  }

  if (period === "lastMonth") {
    const current = getPreviousMonthRange(reference);
    const previous = getPreviousMonthRange(
      new Date(reference.getFullYear(), reference.getMonth() - 1, 15)
    );
    return { current, previous };
  }

  // Default to this month
  return buildMonthlyComparison(reference);
}
