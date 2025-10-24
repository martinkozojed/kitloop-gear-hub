import { supabase } from "@/lib/supabase";
import {
  ActivityEvent,
  CategoryRevenueStat,
  CustomerKpis,
  DateRange,
  DeadInventoryStat,
  ProviderAnalyticsPayload,
  RevenueComparison,
  RevenueQueryRange,
  RevenueTrendPoint,
  RevenueTrendQuery,
  ReservationStatusStat,
  TopCustomerStat,
  TopItemPerformance,
  UtilizationHeatmapPoint,
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

export async function fetchTopItems(
  providerId: string,
  limit = 10
): Promise<TopItemPerformance[]> {
  const { data, error } = await supabase
    .from("analytics_provider_item_performance")
    .select(
      "gear_id, gear_name, category, revenue_cents, reservation_count, last_rented_at, quantity_available"
    )
    .eq("provider_id", providerId)
    .order("revenue_cents", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    gearId: item.gear_id ?? "",
    gearName: item.gear_name ?? null,
    category: item.category ?? null,
    revenueCents: Number(item.revenue_cents ?? 0),
    reservationCount: Number(item.reservation_count ?? 0),
    lastRentedAt: item.last_rented_at ?? null,
    quantityAvailable: item.quantity_available ?? null,
  }));
}

export async function fetchCategoryRevenue(
  providerId: string
): Promise<CategoryRevenueStat[]> {
  const { data, error } = await supabase
    .from("analytics_provider_category_revenue")
    .select("category, revenue_cents, reservation_count")
    .eq("provider_id", providerId)
    .order("revenue_cents", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    category: row.category ?? "Uncategorized",
    revenueCents: Number(row.revenue_cents ?? 0),
    reservationCount: Number(row.reservation_count ?? 0),
  }));
}

export async function fetchDeadInventory(
  providerId: string,
  thresholdDays = 30,
  limit = 25
): Promise<DeadInventoryStat[]> {
  const { data, error } = await supabase
    .from("analytics_provider_item_performance")
    .select(
      "gear_id, gear_name, category, revenue_cents, reservation_count, last_rented_at"
    )
    .eq("provider_id", providerId)
    .order("last_rented_at", { ascending: true, nullsFirst: true });

  if (error) {
    throw error;
  }

  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  return (data ?? [])
    .map<DeadInventoryStat>((item) => {
      const lastRentedAt = item.last_rented_at;
      const lastTime = lastRentedAt ? new Date(lastRentedAt).getTime() : null;
      const daysSince = lastTime
        ? Math.floor((now - lastTime) / (24 * 60 * 60 * 1000))
        : null;

      return {
        gearId: item.gear_id ?? "",
        gearName: item.gear_name ?? null,
        category: item.category ?? null,
        lastRentedAt,
        daysSinceLastRental: daysSince,
        reservationCount: Number(item.reservation_count ?? 0),
      };
    })
    .filter((item) => {
      if (item.daysSinceLastRental === null) {
        return true;
      }
      return item.daysSinceLastRental >= thresholdDays;
    })
    .slice(0, limit);
}

export async function fetchActivityFeed(
  providerId: string,
  limit = 30
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from("analytics_provider_activity_feed")
    .select(
      "reservation_id, gear_name, customer_name, status, created_at, updated_at, start_date, end_date"
    )
    .eq("provider_id", providerId)
    .order("updated_at", { ascending: false, nullsFirst: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    reservationId: row.reservation_id,
    gearName: row.gear_name,
    customerName: row.customer_name,
    status: row.status,
    eventTime: row.updated_at ?? row.created_at,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}

export async function fetchUtilizationHeatmap(
  providerId: string,
  range?: DateRange
): Promise<UtilizationHeatmapPoint[]> {
  let query = supabase
    .from("analytics_provider_daily_utilisation")
    .select("usage_date, active_units, total_units")
    .eq("provider_id", providerId)
    .order("usage_date", { ascending: true });

  if (range) {
    query = query
      .gte("usage_date", range.start.toISOString().slice(0, 10))
      .lte("usage_date", range.end.toISOString().slice(0, 10));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    date: row.usage_date ?? "",
    activeUnits: Number(row.active_units ?? 0),
    totalUnits: Number(row.total_units ?? 0),
  }));
}

export async function fetchCustomerKpis(
  providerId: string,
  range?: DateRange
): Promise<CustomerKpis> {
  let query = supabase
    .from("reservations")
    .select(
      "customer_name, customer_email, customer_phone, amount_total_cents, total_price, deposit_paid, status"
    )
    .eq("provider_id", providerId)
    .in("status", REVENUE_STATUSES);

  if (range) {
    query = query
      .gte("start_date", range.start.toISOString())
      .lt("start_date", range.end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const reservations = data ?? [];
  let revenueCents = 0;
  let depositCount = 0;
  const customers = new Set<string>();

  reservations.forEach((row) => {
    const amount = row.amount_total_cents ?? (row.total_price ? Number(row.total_price) * 100 : 0);
    if (!Number.isNaN(amount)) {
      revenueCents += Math.max(0, Math.round(amount));
    }
    if (row.deposit_paid) {
      depositCount += 1;
    }

    const identifier = row.customer_email || row.customer_phone || row.customer_name;
    if (identifier) {
      customers.add(identifier);
    }
  });

  const totalReservations = reservations.length;
  const totalCustomers = customers.size;
  const averageOrderValueCents = totalReservations
    ? Math.round(revenueCents / totalReservations)
    : 0;
  const repeatCustomerRate = totalCustomers
    ? Math.max(0, totalReservations - totalCustomers) / totalCustomers
    : 0;
  const depositRate = totalReservations ? depositCount / totalReservations : 0;

  return {
    averageOrderValueCents,
    repeatCustomerRate,
    depositRate,
    totalCustomers,
    totalReservations,
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
