import { MapPin, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { PublicProvider } from "@/types/profile";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function useOpenStatus(
  hours: PublicProvider["business_hours"],
): "open" | "closed" | null {
  if (!hours) return null;

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const slot = hours[dayKey];
  if (!slot?.open || !slot?.close) return "closed";

  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= slot.open && hhmm < slot.close ? "open" : "closed";
}

interface Props {
  provider: PublicProvider;
}

export default function ProfileHero({ provider }: Props) {
  const { t } = useTranslation();
  const status = useOpenStatus(provider.business_hours);

  return (
    <section className="flex flex-col sm:flex-row items-start gap-5">
      {/* Logo / fallback avatar */}
      {provider.logo_url ? (
        <img
          src={provider.logo_url}
          alt={provider.rental_name}
          className="h-16 w-16 rounded-full object-cover bg-muted shrink-0"
        />
      ) : (
        <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-brand-700 leading-none">
            {provider.rental_name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="space-y-2 min-w-0">
        {/* Name + status badge */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            {provider.rental_name}
          </h1>
          {status === "open" && (
            <Badge variant="success">{t("publicProfile.openNow")}</Badge>
          )}
          {status === "closed" && (
            <Badge variant="destructive">{t("publicProfile.closedNow")}</Badge>
          )}
        </div>

        {/* Location */}
        {provider.location && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {provider.location}
          </p>
        )}

        {/* Website */}
        {provider.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 transition-colors duration-fast"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {provider.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
      </div>
    </section>
  );
}
