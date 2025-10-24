import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLastNDaysRange } from "@/lib/analytics/calculations";
import { fetchTopCustomers } from "@/lib/analytics/queries";
import { TopCustomerStat } from "@/lib/analytics/types";

const DEFAULT_CUSTOMER_DAYS = 90;
const DEFAULT_LIMIT = 5;

export function useCustomerStats(providerId?: string, limit = DEFAULT_LIMIT) {
  const range = useMemo(() => getLastNDaysRange(DEFAULT_CUSTOMER_DAYS), []);

  const query = useQuery<TopCustomerStat[]>({
    queryKey: ["analytics", "customers", providerId, range, limit],
    queryFn: () => fetchTopCustomers(providerId!, range, limit),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: query.data ?? [],
    range,
    query,
  };
}
