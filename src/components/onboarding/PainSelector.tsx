import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section, painIcons } from "./shared";
import type { Pain, PainItem } from "./shared";

interface PainSelectorProps {
  pain: Pain | null;
  onPainClick: (key: Pain) => void;
}

export function PainSelector({ pain, onPainClick }: PainSelectorProps) {
  const { t } = useTranslation();
  const pains = t("onboarding.pains", { returnObjects: true }) as PainItem[];

  return (
    <Section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.painTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("onboarding.painSub")}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label={t("onboarding.painTitle")}>
          {pains.map(({ key, label }) => {
            const Icon = painIcons[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={pain === key}
                onClick={() => onPainClick(key)}
                className={cn(
                  "group rounded-xl border-2 p-4 text-left transition-all duration-fast ease-spring",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
                  pain === key
                    ? "border-brand-500 bg-brand-50 shadow-brand"
                    : "border-border bg-card hover:border-brand-300 hover:bg-brand-50/50 hover:-translate-y-1 hover:shadow-elevated",
                )}
              >
                <div className={cn(
                  "mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  pain === key
                    ? "bg-brand-100 text-brand-700"
                    : "bg-muted text-muted-foreground group-hover:bg-brand-100 group-hover:text-brand-700",
                )}>
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                </div>
                <p className={cn(
                  "text-sm font-semibold leading-snug whitespace-pre-line",
                  pain === key ? "text-brand-800" : "text-foreground",
                )}>
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-xs font-medium flex items-center gap-1 transition-opacity",
                    pain === key ? "text-brand-600 opacity-100" : "opacity-0",
                  )}
                  aria-hidden={pain !== key}
                >
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  {t("onboarding.showingFeatures")}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
