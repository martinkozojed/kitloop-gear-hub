import { useQuery } from "@tanstack/react-query";
import {
  fetchProviderBySlug,
  fetchProviderCatalog,
} from "@/services/providerProfile";
import type { PublicProvider, PublicProduct } from "@/types/profile";

export function useProviderProfile(slug: string | undefined) {
  const providerQuery = useQuery({
    queryKey: ["provider-profile", slug],
    queryFn: () => fetchProviderBySlug(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  const catalogQuery = useQuery({
    queryKey: ["provider-catalog", providerQuery.data?.id],
    queryFn: () => fetchProviderCatalog(providerQuery.data!.id),
    enabled: !!providerQuery.data?.id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    provider: (providerQuery.data ?? null) as PublicProvider | null,
    catalog: (catalogQuery.data ?? []) as PublicProduct[],
    isProviderLoading: providerQuery.isLoading,
    isCatalogLoading: catalogQuery.isLoading,
    isError: providerQuery.isError || catalogQuery.isError,
    error: providerQuery.error || catalogQuery.error,
    /** True when slug resolved but no provider matched (404). */
    notFound: !providerQuery.isLoading && !providerQuery.isError && !providerQuery.data,
  };
}
