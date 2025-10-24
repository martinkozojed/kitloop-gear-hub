import { useQuery } from "@tanstack/react-query";
import { fetchUtilizationMetrics } from "@/lib/analytics/queries";
import { UtilizationMetrics } from "@/lib/analytics/types";

export function useUtilization(providerId?: string) {
  const query = useQuery<UtilizationMetrics>({
    queryKey: ["analytics", "utilization", providerId],
    queryFn: () => fetchUtilizationMetrics(providerId!),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    query,
  };
}
