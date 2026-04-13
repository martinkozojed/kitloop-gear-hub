import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowLayer, fireCtaEvent } from "./shared";
import type { Lang, Pain } from "./shared";

interface OnboardingHeroProps {
  lang: Lang;
  pain: Pain | null;
  signupHref: string;
  isProvider: boolean;
  isAdmin: boolean;
  onScrollToFeatures: () => void;
}

export function OnboardingHero({ lang, pain, signupHref, isProvider, isAdmin, onScrollToFeatures }: OnboardingHeroProps) {
  const { t } = useTranslation();
  const heroSteps = t("onboarding.heroSteps", { returnObjects: true }) as string[];

  return (
    <section className="relative bg-white">
      <GlowLayer />
      <div className="relative mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">

          {/* Left — copy + CTA */}
          <motion.div
            initial={{ opacity: 1, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-5"
          >
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 border border-emerald-100">
              {t("onboarding.heroBadge")}
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl text-foreground">
              {t("onboarding.heroH1")}
            </h1>
            <p className="text-slate-500 leading-relaxed text-lg">{t("onboarding.heroSub")}</p>

            <ul className="space-y-2 py-1">
              {heroSteps.map((step) => (
                <li key={step} className="flex gap-2.5 text-sm font-medium text-slate-700">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 pt-2">
              {(isProvider || isAdmin) ? (
                <Button asChild variant="cta" size="cta" className="w-full sm:w-auto">
                  <Link to="/provider/dashboard">{lang === "en" ? "Go to Dashboard" : "Přejít do dashboardu"}</Link>
                </Button>
              ) : (
                <Button
                  asChild variant="cta" size="cta" className="w-full sm:w-auto"
                  onClick={() => fireCtaEvent("hero", lang, pain)}
                >
                  <Link to={signupHref}>{t("onboarding.heroCta1")}</Link>
                </Button>
              )}
              <button
                type="button"
                onClick={onScrollToFeatures}
                className={cn(
                  "self-start px-4 py-2.5 text-sm font-semibold text-muted-foreground",
                  "transition-colors hover:text-emerald-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded",
                )}
              >
                {t("onboarding.heroCta3")} ↓
              </button>
            </div>
          </motion.div>

          {/* Right — static UI preview */}
          <div className="lg:pl-6">
            <div className="relative rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-slate-50 aspect-[4/3] flex items-center justify-center">
              <img
                src="/onboarding/hero-loop-poster.png"
                alt="Kitloop operational dashboard — KPI strip, today's operations agenda, active rentals overview"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 -z-10">
                <p className="text-sm font-medium text-slate-500">Loading…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
