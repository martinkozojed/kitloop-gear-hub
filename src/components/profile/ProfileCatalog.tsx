import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import ProfileCatalogCard from "@/components/profile/ProfileCatalogCard";
import { useScrollReveal } from "@/hooks/useScrollReveal";
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

  const { ref: revealRef, isVisible } = useScrollReveal();

  const handleSelect = (product: PublicProduct) => {
    onSelect?.(product);
  };

  return (
    <section ref={revealRef} className="space-y-5">
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
          {filtered.map((product, i) => (
            <div
              key={product.id}
              className={`transition-all ease-spring ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDuration: '350ms', transitionDelay: isVisible ? `${i * 60}ms` : '0ms' }}
            >
              <ProfileCatalogCard
                product={product}
                currency={currency}
                onSelect={handleSelect}
              />
            </div>
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
