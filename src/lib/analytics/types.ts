export type ReservationStatus =
  | "hold"
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled";

export interface RevenuePeriodSummary {
  /** ISO string representing the start of the current period (inclusive). */
  periodStart: string;
  /** ISO string representing the end of the current period (exclusive). */
  periodEnd: string;
  /** Total revenue for the period in whole currency cents. */
  totalCents: number;
  /** Display currency (e.g. CZK). */
  currency: string;
}

export interface RevenueComparison {
  current: RevenuePeriodSummary;
  previous: RevenuePeriodSummary;
  /** Percentage change from previous to current period (e.g. 0.12 = +12%). */
  changeRatio: number;
}

export interface RevenueTrendPoint {
  /** ISO date (YYYY-MM-DD) representing the bucket. */
  date: string;
  /** Revenue for the bucket in cents. */
  totalCents: number;
}

export interface ReservationStatusStat {
  status: ReservationStatus;
  count: number;
}

export interface TopCustomerStat {
  customerName: string;
  totalCents: number;
  reservationCount: number;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface UtilizationMetrics {
  /** Ratio of active units to total units (0-1). */
  utilizationRatio: number;
  /**
   * Number of individual units currently loaned out.
   * In the current data model: activeUnits equals activeReservationCount (1 reservation = 1 unit).
   * Future: When quantity is added to reservations, this will be SUM(quantity) for active reservations.
   */
  activeUnits: number;
  /** Total number of available units in the provider inventory (sum of quantity_available for all active gear). */
  totalUnits: number;
  /** Count of reservations considered active (status: hold, confirmed, or active) and not yet ended. */
  activeReservationCount: number;
}

export interface ProviderAnalyticsPayload {
  revenue: RevenueComparison;
  revenueTrend: RevenueTrendPoint[];
  reservationStatuses: ReservationStatusStat[];
  topCustomers: TopCustomerStat[];
  utilization: UtilizationMetrics;
  topItems?: TopItemPerformance[];
  categoryRevenue?: CategoryRevenueStat[];
  deadInventory?: DeadInventoryStat[];
  activityFeed?: ActivityEvent[];
  utilizationHeatmap?: UtilizationHeatmapPoint[];
  customerKpis?: CustomerKpis;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RevenueQueryRange {
  current: DateRange;
  previous: DateRange;
}

export type ChartBucket = "day" | "week" | "month";

export interface RevenueTrendQuery {
  range: DateRange;
  bucket: ChartBucket;
}
export type AnalyticsPeriod =
  | "last7Days"
  | "last30Days"
  | "thisMonth"
  | "lastMonth";

export interface TopItemPerformance {
  gearId: string;
  gearName: string | null;
  category: string | null;
  revenueCents: number;
  reservationCount: number;
  lastRentedAt: string | null;
  quantityAvailable: number | null;
}

export interface CategoryRevenueStat {
  category: string;
  revenueCents: number;
  reservationCount: number;
}

export interface DeadInventoryStat {
  gearId: string;
  gearName: string | null;
  category: string | null;
  lastRentedAt: string | null;
  daysSinceLastRental: number | null;
  reservationCount: number;
}

export interface ActivityEvent {
  reservationId: string;  // Now guaranteed non-null
  gearName: string | null;
  customerName: string;  // Now guaranteed non-null
  status: string | null;
  eventTime: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface UtilizationHeatmapPoint {
  date: string;
  activeUnits: number;
  totalUnits: number;
}

export interface CustomerKpis {
  averageOrderValueCents: number;
  repeatCustomerRate: number;
  depositRate: number;
  totalCustomers: number;
  totalReservations: number;
}
