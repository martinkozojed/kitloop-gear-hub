import { Package, Phone, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  phone?: string | null;
  email?: string | null;
}

export default function ProfileEmptyState({ phone, email }: Props) {
  const { t } = useTranslation();

  return (
    <section className="py-16 flex flex-col items-center text-center" aria-label={t("publicProfile.catalogEmpty")}>
      <Package className="h-12 w-12 text-brand-300 mb-4" aria-hidden="true" />
      <h2 className="text-lg font-semibold mb-1">
        {t("publicProfile.catalogEmpty")}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t("publicProfile.catalogEmptyDesc")}
      </p>

      {(phone || email) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 text-sm">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 transition-colors duration-fast"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 transition-colors duration-fast"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
          )}
        </div>
      )}
    </section>
  );
}
