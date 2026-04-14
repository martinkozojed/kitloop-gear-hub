import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PublicProduct } from "@/types/profile";

const CURRENCY_SYMBOL: Record<string, string> = {
  CZK: "Kč",
  EUR: "\u20AC",
  USD: "$",
  GBP: "\u00A3",
};

interface Props {
  product: PublicProduct;
  currency: string | null;
  onSelect?: (product: PublicProduct) => void;
}

export default function ProfileCatalogCard({
  product,
  currency,
  onSelect,
}: Props) {
  const { t } = useTranslation();

  const sym = CURRENCY_SYMBOL[currency?.toUpperCase() ?? ""] ?? currency ?? "Kč";

  const variants = (product.product_variants ?? []).filter(
    (v) => v.is_active !== false,
  );
  const visibleVariants = variants.slice(0, 3);
  const hiddenCount = variants.length - visibleVariants.length;

  return (
    <Card
      className="group overflow-hidden cursor-pointer rounded-token-lg border border-border hover:border-brand-300 hover:shadow-elevated hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] active:shadow-card transition-all duration-fast ease-spring"
      onClick={() => onSelect?.(product)}
    >
      {/* Image */}
      {product.image_url ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-brand-50/50 flex items-center justify-center">
          <Package className="h-10 w-10 text-brand-300" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">
            {product.name}
          </h3>
          <Badge variant="secondary" className="shrink-0 text-xs bg-brand-50 text-brand-700 border-0">
            {product.category}
          </Badge>
        </div>

        {/* Price */}
        <p className="text-sm text-brand-700 font-heading font-semibold tabular-nums">
          {product.base_price_cents != null
            ? t("publicProfile.priceFrom", {
                price: (product.base_price_cents / 100).toLocaleString("cs-CZ"),
                currency: sym,
              })
            : t("publicProfile.priceOnRequest")}
        </p>

        {/* Variants */}
        {variants.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {visibleVariants.map((v) => (
              <Badge
                key={v.id}
                variant="secondary"
                className="text-xs font-normal"
              >
                {v.name}
              </Badge>
            ))}
            {hiddenCount > 0 && (
              <span className="text-xs text-muted-foreground self-center">
                {t("publicProfile.moreVariants", { count: hiddenCount })}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
