import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Section } from "./shared";

export function TrustBlock() {
  const { t } = useTranslation();
  const { ref: revealRef, isVisible } = useScrollReveal();

  return (
    <Section className="bg-white py-16 md:py-24">
      <div ref={revealRef} className={`transition-all duration-slow ease-spring ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <h2 className="text-xl font-bold md:text-2xl mb-2 text-foreground">
          {t("onboarding.trustTitle")}
        </h2>
        <p className="text-sm font-medium text-brand-600 mb-6">{t("onboarding.trustSub")}</p>
        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line text-left md:text-center mx-auto max-w-2xl bg-muted p-6 rounded-xl">
          {t("onboarding.trustContent")}
        </div>
      </div>
      </div>
    </Section>
  );
}
