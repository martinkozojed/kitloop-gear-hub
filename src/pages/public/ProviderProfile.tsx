import { useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileCatalog from "@/components/profile/ProfileCatalog";
import ProfileEmptyState from "@/components/profile/ProfileEmptyState";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileRequestForm from "@/components/profile/ProfileRequestForm";
import ProfileRequestModal, {
  ProfileRequestTrigger,
} from "@/components/profile/ProfileRequestModal";
import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/types/profile";

function CatalogSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProviderProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const {
    provider,
    catalog,
    isProviderLoading,
    isCatalogLoading,
    isError,
    notFound,
  } = useProviderProfile(slug);

  const [selectedProduct, setSelectedProduct] =
    useState<PublicProduct | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((product: PublicProduct) => {
    setSelectedProduct(product);
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      setSheetOpen(true);
    }
  }, []);

  const clearSelection = useCallback(() => setSelectedProduct(null), []);

  if (isProviderLoading) return <ProfileSkeleton />;

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {t("publicProfile.notFound")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t("publicProfile.notFoundDesc")}
        </p>
        <Button asChild variant="outline">
          <Link to="/">{t("publicProfile.backHome")}</Link>
        </Button>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {t("publicProfile.error")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t("publicProfile.errorDesc")}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("publicProfile.errorRetry")}
        </Button>
      </div>
    );
  }

  const catalogCount = catalog.length;
  const ogDescription = provider.location
    ? t("publicProfile.ogDescriptionWithLocation", {
        name: provider.rental_name,
        location: provider.location,
        count: catalogCount,
      })
    : t("publicProfile.ogDescription", {
        name: provider.rental_name,
        count: catalogCount,
      });

  return (
    <div className="light min-h-screen bg-background">
      <Helmet>
        <title>{provider.rental_name} — Kitloop</title>
        <meta name="description" content={ogDescription} />
        <meta
          property="og:title"
          content={`${provider.rental_name} — Kitloop`}
        />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="website" />
        {provider.logo_url && (
          <meta property="og:image" content={provider.logo_url} />
        )}
      </Helmet>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <ProfileHero provider={provider} />

        {isCatalogLoading ? (
          <CatalogSkeleton />
        ) : catalog.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProfileCatalog
                catalog={catalog}
                currency={provider.currency}
                onSelect={handleSelect}
              />
            </div>
            <div className="hidden lg:block lg:col-span-1" ref={formRef}>
              <div className="lg:sticky lg:top-24">
                <ProfileRequestForm
                  providerId={provider.id}
                  selectedProduct={selectedProduct}
                  onClearSelection={clearSelection}
                />
              </div>
            </div>
          </div>
        ) : (
          <ProfileEmptyState
            phone={provider.phone}
            email={provider.email}
          />
        )}

        <ProfileInfo provider={provider} />
      </main>

      {/* Mobile: floating trigger + bottom sheet */}
      <ProfileRequestTrigger onClick={() => setSheetOpen(true)} />
      <ProfileRequestModal
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        providerId={provider.id}
        providerName={provider.rental_name}
        selectedProduct={selectedProduct}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
