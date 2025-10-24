import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCustomerKpis } from "@/lib/analytics/queries";
import { CustomerKpis, DateRange } from "@/lib/analytics/types";

export function useCustomerKpis(
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

  const query = useQuery<CustomerKpis>({
    queryKey: ["analytics", "customer-kpis", providerId, serialisedRange],
    queryFn: () => fetchCustomerKpis(providerId!, range),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    query,
  };
}
