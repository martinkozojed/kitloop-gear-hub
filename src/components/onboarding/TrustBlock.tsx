import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Section } from "./shared";

export function TrustBlock() {
  const { t } = useTranslation();

  return (
    <Section className="bg-white py-12">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <h2 className="text-xl font-bold md:text-2xl mb-2 text-slate-800">
          {t("onboarding.trustTitle")}
        </h2>
        <p className="text-sm font-medium text-emerald-600 mb-6">{t("onboarding.trustSub")}</p>
        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line text-left md:text-center mx-auto max-w-2xl bg-slate-50 p-6 rounded-xl">
          {t("onboarding.trustContent")}
        </div>
      </div>
    </Section>
  );
}
