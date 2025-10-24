import { useQuery } from "@tanstack/react-query";
import { fetchTopItems } from "@/lib/analytics/queries";
import { TopItemPerformance } from "@/lib/analytics/types";

export function useTopItems(providerId?: string, limit = 10) {
  const query = useQuery<TopItemPerformance[]>({
    queryKey: ["analytics", "top-items", providerId, limit],
    queryFn: () => fetchTopItems(providerId!, limit),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: query.data ?? [],
    query,
  };
}
