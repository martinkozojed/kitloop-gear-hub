import { supabase } from "@/lib/supabase";
import {
  DateRange,
  ProviderAnalyticsPayload,
  RevenueComparison,
  RevenueQueryRange,
  RevenueTrendPoint,
  RevenueTrendQuery,
  ReservationStatusStat,
  TopCustomerStat,
  UtilizationMetrics,
} from "./types";
import {
  calculatePercentChange,
  normaliseTrendPoints,
  sumCents,
} from "./calculations";

/**
 * Statuses that count towards revenue figures.
 * We treat confirmed/active/completed as billable.
 */
export const REVENUE_STATUSES = ["confirmed", "active", "completed"] as const;

export type RevenueStatus = (typeof REVENUE_STATUSES)[number];

/**
 * Statuses that should be considered active for utilization and dashboard counts.
 */
export const ACTIVE_RESERVATION_STATUSES = ["hold", "confirmed", "active"] as const;

export type ActiveReservationStatus = (typeof ACTIVE_RESERVATION_STATUSES)[number];

export interface RevenueRecord {
  id: string;
  provider_id?: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  total_price: number | null;
  amount_total_cents: number | null;
  status: string | null;
  currency: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
}

/**
 * Fetch revenue data for the given provider within a date range.
 * Actual aggregation/calculation happens in analytic hooks.
 */
export async function fetchRevenueRecords(
  providerId: string,
  range: DateRange
): Promise<RevenueRecord[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, provider_id, start_date, end_date, created_at, total_price, amount_total_cents, status, currency, customer_name, customer_email, customer_phone"
    )
    .eq("provider_id", providerId)
    .gte("start_date", range.start.toISOString())
    .lt("start_date", range.end.toISOString());

  if (error) {
    throw error;
  }

  return data ?? [];
}

function resolveCurrency(records: RevenueRecord[]): string {
  const withCurrency = records.find((record) => record.currency);
  return withCurrency?.currency ?? "CZK";
}

function revenueCents(record: RevenueRecord): number {
  if (!record.status || !REVENUE_STATUSES.includes(record.status as RevenueStatus)) {
    return 0;
  }

  const amountTotal =
    record.amount_total_cents !== null && record.amount_total_cents !== undefined
      ? Number(record.amount_total_cents)
      : undefined;

  if (typeof amountTotal === "number" && !Number.isNaN(amountTotal)) {
    return Math.max(0, Math.round(amountTotal));
  }

  if (record.total_price !== null && record.total_price !== undefined) {
    const totalPrice = Number(record.total_price);
    if (!Number.isNaN(totalPrice)) {
      return Math.max(0, Math.round(totalPrice * 100));
    }
  }

  return 0;
}

function bucketKey(dateIso: string | null, bucket: RevenueTrendQuery["bucket"]): string | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;

  if (bucket === "day") {
    return date.toISOString().slice(0, 10);
  }

  if (bucket === "week") {
    const d = new Date(date);
    const day = (d.getUTCDay() + 6) % 7; // convert Sunday(0) -> 6
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function fetchRevenueComparison(
  providerId: string,
  range: RevenueQueryRange
): Promise<RevenueComparison> {
  const [currentRecords, previousRecords] = await Promise.all([
    fetchRevenueRecords(providerId, range.current),
    fetchRevenueRecords(providerId, range.previous),
  ]);

  const currency =
    resolveCurrency(currentRecords) || resolveCurrency(previousRecords) || "CZK";

  const currentTotal = sumCents(currentRecords.map(revenueCents));
  const previousTotal = sumCents(previousRecords.map(revenueCents));
  const changeRatio = calculatePercentChange(currentTotal, previousTotal);

  return {
    current: {
      periodStart: range.current.start.toISOString(),
      periodEnd: range.current.end.toISOString(),
      totalCents: currentTotal,
      currency,
    },
    previous: {
      periodStart: range.previous.start.toISOString(),
      periodEnd: range.previous.end.toISOString(),
      totalCents: previousTotal,
      currency,
    },
    changeRatio,
  };
}

export async function fetchRevenueTrend(
  providerId: string,
  query: RevenueTrendQuery
): Promise<RevenueTrendPoint[]> {
  const records = await fetchRevenueRecords(providerId, query.range);
  const bucketed = new Map<string, number>();

  records.forEach((record) => {
    const key =
      bucketKey(record.start_date ?? record.created_at, query.bucket) ??
      bucketKey(record.created_at ?? record.start_date, query.bucket);

    if (!key) return;

    const amount = revenueCents(record);
    bucketed.set(key, (bucketed.get(key) ?? 0) + amount);
  });

  const points: RevenueTrendPoint[] = Array.from(bucketed.entries()).map(
    ([date, totalCents]) => ({ date, totalCents })
  );

  return normaliseTrendPoints(points);
}

export async function fetchReservationStatusStats(
  providerId: string,
  range: DateRange
): Promise<ReservationStatusStat[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("status")
    .eq("provider_id", providerId)
    .gte("start_date", range.start.toISOString())
    .lt("start_date", range.end.toISOString());

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();

  (data ?? []).forEach((row) => {
    const status = (row.status as string | null) ?? "pending";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([status, count]) => ({
    status: status as ReservationStatusStat["status"],
    count,
  }));
}

export async function fetchTopCustomers(
  providerId: string,
  range: DateRange,
  limit = 5
): Promise<TopCustomerStat[]> {
  const records = await fetchRevenueRecords(providerId, range);
  const customerMap = new Map<string, TopCustomerStat>();

  records.forEach((record) => {
    const revenue = revenueCents(record);
    if (revenue <= 0) return;

    const key = record.customer_email || record.customer_phone || record.customer_name;
    const existing = customerMap.get(key);

    if (existing) {
      existing.totalCents += revenue;
      existing.reservationCount += 1;
    } else {
      customerMap.set(key, {
        customerName: record.customer_name,
        totalCents: revenue,
        reservationCount: 1,
        customerEmail: record.customer_email,
        customerPhone: record.customer_phone,
      });
    }
  });

  return Array.from(customerMap.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, limit);
}

export async function fetchUtilizationMetrics(
  providerId: string
): Promise<UtilizationMetrics> {
  const [gearResult, reservationsResult] = await Promise.all([
    supabase
      .from("gear_items")
      .select("quantity_available, active")
      .eq("provider_id", providerId),
    (() => {
      const nowIso = new Date().toISOString();
      return supabase
        .from("reservations")
        .select("id, start_date, end_date, status")
        .eq("provider_id", providerId)
        .lte("start_date", nowIso)
        .in("status", ACTIVE_RESERVATION_STATUSES);
    })(),
  ]);

  if (gearResult.error) {
    throw gearResult.error;
  }
  if (reservationsResult.error) {
    throw reservationsResult.error;
  }

  const activeGear = (gearResult.data ?? []).filter((gear) => gear.active);
  const totalUnits = activeGear.reduce((sum, gear) => {
    const value = gear.quantity_available ?? 0;
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const now = new Date();
  const activeReservationCount =
    reservationsResult.data?.filter((reservation) => {
      if (!reservation) return false;
      const endDate = reservation.end_date ? new Date(reservation.end_date) : null;
      if (endDate && Number.isNaN(endDate.getTime())) {
        return true;
      }
      return !endDate || endDate > now;
    }).length ?? 0;
  const activeUnits = activeReservationCount; // 1 reservation = 1 unit (current assumption)

  const utilizationRatio =
    totalUnits > 0 ? Math.min(1, activeUnits / totalUnits) : 0;

  return {
    utilizationRatio,
    activeUnits,
    totalUnits,
    activeReservationCount,
  };
}

export async function fetchProviderAnalytics(
  providerId: string,
  options: {
    revenueRange: RevenueQueryRange;
    trendRange: RevenueTrendQuery;
    statusRange: DateRange;
    customersRange: DateRange;
  }
): Promise<ProviderAnalyticsPayload> {
  const [revenue, trend, statuses, customers, utilization] = await Promise.all([
    fetchRevenueComparison(providerId, options.revenueRange),
    fetchRevenueTrend(providerId, options.trendRange),
    fetchReservationStatusStats(providerId, options.statusRange),
    fetchTopCustomers(providerId, options.customersRange),
    fetchUtilizationMetrics(providerId),
  ]);

  return {
    revenue,
    revenueTrend: trend,
    reservationStatuses: statuses,
    topCustomers: customers,
    utilization,
  };
}
