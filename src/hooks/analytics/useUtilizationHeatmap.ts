import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUtilizationHeatmap } from "@/lib/analytics/queries";
import { DateRange, UtilizationHeatmapPoint } from "@/lib/analytics/types";

export function useUtilizationHeatmap(
  providerId?: string,
  range?: DateRange
) {
  const serialisedRange = useMemo(() => {
    if (!range) return null;
    return {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    };
  }, [range]);

  const query = useQuery<UtilizationHeatmapPoint[]>({
    queryKey: ["analytics", "utilization-heatmap", providerId, serialisedRange],
    queryFn: () => fetchUtilizationHeatmap(providerId!, range),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data ?? [],
    query,
  };
}
