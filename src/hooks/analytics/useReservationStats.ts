import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLastNDaysRange } from "@/lib/analytics/calculations";
import { fetchReservationStatusStats } from "@/lib/analytics/queries";
import { DateRange, ReservationStatusStat } from "@/lib/analytics/types";

const DEFAULT_STATUS_DAYS = 30;

export function useReservationStats(
  providerId?: string,
  rangeOverride?: DateRange
) {
  const range = useMemo(
    () => rangeOverride ?? getLastNDaysRange(DEFAULT_STATUS_DAYS),
    [rangeOverride]
  );

  const query = useQuery<ReservationStatusStat[]>({
    queryKey: ["analytics", "reservations", "status", providerId, range],
    queryFn: () => fetchReservationStatusStats(providerId!, range),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data ?? [],
    range,
    query,
  };
}
