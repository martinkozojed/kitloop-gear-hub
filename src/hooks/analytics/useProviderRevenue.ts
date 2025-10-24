import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildComparisonForPeriod,
  determineChartBucket,
} from "@/lib/analytics/calculations";
import {
  fetchRevenueComparison,
  fetchRevenueTrend,
} from "@/lib/analytics/queries";
import {
  AnalyticsPeriod,
  RevenueComparison,
  RevenueTrendPoint,
} from "@/lib/analytics/types";

export function useProviderRevenue(
  providerId?: string,
  period: AnalyticsPeriod = "thisMonth"
) {
  const comparisonRange = useMemo(
    () => buildComparisonForPeriod(period),
    [period]
  );

  const trendRange = useMemo(() => {
    const range = comparisonRange.current;
    const bucket = determineChartBucket(range);
    return { range, bucket };
  }, [comparisonRange]);

  const comparisonQuery = useQuery<RevenueComparison>({
    queryKey: ["analytics", "revenue", "comparison", providerId, period],
    queryFn: () => fetchRevenueComparison(providerId!, comparisonRange),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  const trendQuery = useQuery<RevenueTrendPoint[]>({
    queryKey: ["analytics", "revenue", "trend", providerId, period],
    queryFn: () => fetchRevenueTrend(providerId!, trendRange),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    comparison: comparisonQuery.data,
    trend: trendQuery.data ?? [],
    comparisonQuery,
    trendQuery,
    comparisonRange,
    trendRange,
    isLoading: comparisonQuery.isLoading || trendQuery.isLoading,
    isError: comparisonQuery.isError || trendQuery.isError,
  };
}
