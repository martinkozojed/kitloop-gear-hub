import { Clock, Truck, FileText, Phone, Mail, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { PublicProvider } from "@/types/profile";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface Props {
  provider: PublicProvider;
}

export default function ProfileInfo({ provider }: Props) {
  const { t } = useTranslation();

  const hasHours = !!(provider.business_hours_display || provider.business_hours);
  const hasPickup = !!provider.pickup_instructions;
  const hasTerms = !!provider.terms_text;
  const hasContact = !!(provider.phone || provider.email || provider.website);

  const showSection = hasHours || hasPickup || hasTerms || hasContact;
  if (!showSection) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Otevírací doba */}
      {hasHours && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading font-semibold">
              <Clock className="h-4 w-4 shrink-0 text-brand-600" />
              {t("publicProfile.hoursTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {provider.business_hours_display ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {provider.business_hours_display}
              </p>
            ) : provider.business_hours ? (
              <dl className="space-y-1 text-sm">
                {DAY_ORDER.map((day) => {
                  const slot = provider.business_hours?.[day];
                  return (
                    <div key={day} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {t(`publicProfile.${day}`)}
                      </dt>
                      <dd className="tabular-nums">
                        {slot?.open && slot?.close
                          ? `${slot.open}–${slot.close}`
                          : t("publicProfile.hoursClosed")}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Vyzvednutí */}
      {hasPickup && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading font-semibold">
              <Truck className="h-4 w-4 shrink-0 text-brand-600" />
              {t("publicProfile.pickupTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {provider.pickup_instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Podmínky */}
      {hasTerms && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading font-semibold">
              <FileText className="h-4 w-4 shrink-0 text-brand-600" />
              {t("publicProfile.termsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {provider.terms_text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Kontakt */}
      {hasContact && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading font-semibold">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              {t("publicProfile.contactTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {provider.phone && (
                <li>
                  <a
                    href={`tel:${provider.phone}`}
                    className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 transition-colors duration-fast"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {provider.phone}
                  </a>
                </li>
              )}
              {provider.email && (
                <li>
                  <a
                    href={`mailto:${provider.email}`}
                    className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 transition-colors duration-fast"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {provider.email}
                  </a>
                </li>
              )}
              {provider.website && (
                <li>
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 transition-colors duration-fast"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    {provider.website
                      .replace(/^https?:\/\//, "")
                      .replace(/\/$/, "")}
                  </a>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
