import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import ProfileCatalogCard from "@/components/profile/ProfileCatalogCard";
import type { PublicProduct } from "@/types/profile";

const ALL = "__all__";

interface Props {
  catalog: PublicProduct[];
  currency: string | null;
  onSelect?: (product: PublicProduct) => void;
}

export default function ProfileCatalog({ catalog, currency, onSelect }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState(ALL);

  const categories = useMemo(
    () => [...new Set(catalog.map((p) => p.category))].sort(),
    [catalog],
  );

  const filtered = useMemo(
    () => (active === ALL ? catalog : catalog.filter((p) => p.category === active)),
    [catalog, active],
  );

  const handleSelect = (product: PublicProduct) => {
    onSelect?.(product);
  };

  return (
    <section className="space-y-5">
      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={active === ALL ? "default" : "outline"}
            onClick={() => setActive(ALL)}
          >
            {t("publicProfile.allCategories")}
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={active === cat ? "default" : "outline"}
              onClick={() => setActive(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {t("publicProfile.productsCount", { count: filtered.length })}
        {active !== ALL && t("publicProfile.productsInCategory", { category: active })}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map((product) => (
            <ProfileCatalogCard
              key={product.id}
              product={product}
              currency={currency}
              onSelect={handleSelect}
            />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          {t("publicProfile.emptyCategory")}
        </p>
      )}
    </section>
  );
}
