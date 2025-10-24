import { useQuery } from "@tanstack/react-query";
import { fetchDeadInventory } from "@/lib/analytics/queries";
import { DeadInventoryStat } from "@/lib/analytics/types";

export function useDeadInventory(
  providerId?: string,
  thresholdDays = 30,
  limit = 25
) {
  const query = useQuery<DeadInventoryStat[]>({
    queryKey: [
      "analytics",
      "dead-inventory",
      providerId,
      thresholdDays,
      limit,
    ],
    queryFn: () => fetchDeadInventory(providerId!, thresholdDays, limit),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: query.data ?? [],
    query,
  };
}
