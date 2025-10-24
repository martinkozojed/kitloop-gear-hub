import { useQuery } from "@tanstack/react-query";
import { fetchActivityFeed } from "@/lib/analytics/queries";
import { ActivityEvent } from "@/lib/analytics/types";

export function useActivityFeed(providerId?: string, limit = 30) {
  const query = useQuery<ActivityEvent[]>({
    queryKey: ["analytics", "activity-feed", providerId, limit],
    queryFn: () => fetchActivityFeed(providerId!, limit),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data ?? [],
    query,
  };
}
