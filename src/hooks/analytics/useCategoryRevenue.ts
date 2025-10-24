import { useQuery } from "@tanstack/react-query";
import { fetchCategoryRevenue } from "@/lib/analytics/queries";
import { CategoryRevenueStat } from "@/lib/analytics/types";

export function useCategoryRevenue(providerId?: string) {
  const query = useQuery<CategoryRevenueStat[]>({
    queryKey: ["analytics", "category-revenue", providerId],
    queryFn: () => fetchCategoryRevenue(providerId!),
    enabled: Boolean(providerId),
    staleTime: 1000 * 60 * 10,
  });

  return {
    data: query.data ?? [],
    query,
  };
}
