import { AnalyticsPeriod } from "@/lib/analytics/types";
import { useProviderRevenue } from "./useProviderRevenue";
import { useReservationStats } from "./useReservationStats";
import { useCustomerStats } from "./useCustomerStats";
import { useUtilization } from "./useUtilization";

export function useAnalytics(
  providerId?: string,
  period: AnalyticsPeriod = "thisMonth"
) {
  const revenue = useProviderRevenue(providerId, period);
  const status = useReservationStats(providerId, revenue.comparisonRange.current);
  const customers = useCustomerStats(providerId);
  const utilization = useUtilization(providerId);

  const isLoading =
    revenue.isLoading ||
    status.query.isLoading ||
    customers.query.isLoading ||
    utilization.query.isLoading;

  const isError =
    revenue.isError ||
    status.query.isError ||
    customers.query.isError ||
    utilization.query.isError;

  return {
    revenue,
    reservationStatuses: status,
    customers,
    utilization,
    isLoading,
    isError,
    period,
  };
}
