import React, { useCallback, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const marketplaceEnabled = import.meta.env.VITE_ENABLE_MARKETPLACE === 'true';
import {
  Search,
  CalendarCheck,
  QrCode,
  PartyPopper,
  ShieldCheck,
  Clock3,
  MessagesSquare,
  Bell,
  LifeBuoy,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type StepKey = "discover" | "book" | "pickup" | "return";
type HeroFeatureKey = "securePayments" | "availability" | "support";
type BehindSceneKey = "notify" | "tracking" | "help";
type EarlyAccessKey = "onboarding" | "communication" | "feedback";

const HERO_FEATURES: Array<{ key: HeroFeatureKey; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "securePayments", icon: ShieldCheck },
  { key: "availability", icon: CalendarCheck },
  { key: "support", icon: PartyPopper },
];

const STEP_ITEMS: Array<{ key: StepKey; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "discover", icon: Search },
  { key: "book", icon: CalendarCheck },
  { key: "pickup", icon: QrCode },
  { key: "return", icon: PartyPopper },
];

const BEHIND_THE_SCENES: Array<{ key: BehindSceneKey; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "notify", icon: Bell },
  { key: "tracking", icon: Clock3 },
  { key: "help", icon: MessagesSquare },
];

const EARLY_ACCESS: Array<{ key: EarlyAccessKey; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "onboarding", icon: LifeBuoy },
  { key: "communication", icon: MessagesSquare },
  { key: "feedback", icon: Sparkles },
];

const JsonLd: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [data]);

  return null;
};

const HowItWorks = () => {
  const { t } = useTranslation();

  const scrollToSteps = useCallback(() => {
    const element = document.getElementById("steps");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const heroFeatures = useMemo(
    () =>
      HERO_FEATURES.map(({ key, icon: Icon }) => ({
        key,
        title: t(`howItWorks.hero.features.${key}.title`),
        description: t(`howItWorks.hero.features.${key}.description`),
        iconLabel: t(`howItWorks.hero.features.${key}.iconLabel`),
        Icon,
      })),
    [t],
  );

  const steps = useMemo(
    () =>
      STEP_ITEMS.map(({ key, icon: Icon }, index) => ({
        key,
        position: index + 1,
        title: t(`howItWorks.steps.${key}.title`),
        description: t(`howItWorks.steps.${key}.description`),
        tip: t(`howItWorks.steps.${key}.tip`),
        iconLabel: t(`howItWorks.steps.${key}.iconLabel`),
        Icon,
      })),
    [t],
  );

  const behindScenes = useMemo(
    () =>
      BEHIND_THE_SCENES.map(({ key, icon: Icon }) => ({
        key,
        title: t(`howItWorks.behind.cards.${key}.title`),
        description: t(`howItWorks.behind.cards.${key}.description`),
        iconLabel: t(`howItWorks.behind.cards.${key}.iconLabel`),
        Icon,
      })),
    [t],
  );

  const earlyAccessHighlights = useMemo(
    () =>
      EARLY_ACCESS.map(({ key, icon: Icon }) => ({
        key,
        title: t(`howItWorks.pilot.highlights.${key}.title`),
        description: t(`howItWorks.pilot.highlights.${key}.description`),
        iconLabel: t(`howItWorks.pilot.highlights.${key}.iconLabel`),
        Icon,
      })),
    [t],
  );

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: t("howItWorks.jsonld.name"),
      description: t("howItWorks.jsonld.description"),
      step: steps.map((step) => ({
        "@type": "HowToStep",
        name: step.title,
        text: step.description,
        position: step.position,
      })),
    }),
    [steps, t],
  );

  return (
    <div className="light bg-background pb-36">
      <JsonLd data={jsonLd} />

      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div className="absolute inset-0 opacity-30 bg-[image:var(--hero-glow)]" />
        <div className="relative container mx-auto px-6 py-20">
          <div className="mx-auto max-w-4xl space-y-10">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm uppercase tracking-widest text-emerald-100">
                {t("howItWorks.hero.badge")}
              </span>
              <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
                {t("howItWorks.hero.title")}
              </h1>
              <p className="text-lg text-emerald-100/90">{t("howItWorks.hero.subtitle")}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {marketplaceEnabled && (
                  <Button asChild variant="cta" size="cta">
                    <Link
                      to="/browse"
                      aria-label="Browse gear"
                      data-cta="browse-gear"
                    >
                      {t("howItWorks.hero.primaryCta")}
                    </Link>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={scrollToSteps}
                  type="button"
                >
                  {t("howItWorks.hero.secondaryCta")}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroFeatures.map(({ key, title, description, iconLabel, Icon }) => (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:border-white/20"
                >
                  <div className="flex items-center gap-2 text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15" role="img" aria-label={iconLabel}>
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-semibold">{title}</p>
                  </div>
                  <p className="mt-2 text-sm text-emerald-100/85">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="steps" className="container mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">{t("howItWorks.steps.sectionTitle")}</h2>
          <p className="mt-4 text-muted-foreground">{t("howItWorks.steps.sectionSubtitle")}</p>
        </div>

        <div className="md:hidden">
          <Accordion
            type="single"
            collapsible
            className="space-y-4"
            aria-label={t("howItWorks.steps.accordionAria")}
            defaultValue={steps[0]?.key}
          >
            {steps.map((step) => (
              <AccordionItem key={step.key} value={step.key} className="overflow-hidden rounded-2xl border border-muted-foreground/15">
                <AccordionTrigger className="px-4 py-3 text-left text-base font-semibold text-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                      {String(step.position).padStart(2, "0")}
                    </span>
                    <span>{step.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <div className="flex items-center gap-3 text-emerald-700">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50" role="img" aria-label={step.iconLabel}>
                      <step.Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {t("howItWorks.steps.stepLabel", { index: step.position })}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
                  <span className="mt-4 inline-flex w-full items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-medium text-emerald-800">
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    {step.tip}
                  </span>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div
          className="relative hidden max-w-4xl space-y-12 md:block"
          role="list"
          aria-label={t("howItWorks.steps.ariaLabel")}
        >
          <div className="absolute left-[23px] top-6 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-emerald-400 via-emerald-200 to-transparent" aria-hidden="true" />
          {steps.map((step, index) => (
            <div key={step.key} className="relative pl-20" role="listitem">
              <div
                className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-lg ring-4 ring-emerald-200/60"
                role="text"
                aria-label={t("howItWorks.steps.stepLabel", { index: step.position })}
              >
                {String(step.position).padStart(2, "0")}
              </div>
              {index < steps.length - 1 && (
                <div
                  className="absolute left-[23px] top-12 h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-emerald-400/80 via-emerald-200/70 to-emerald-100/0"
                  aria-hidden="true"
                />
              )}
              <div className="rounded-2xl border border-muted-foreground/10 bg-white/95 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex flex-wrap items-center gap-3 text-emerald-700">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50" role="img" aria-label={step.iconLabel}>
                    <step.Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {t("howItWorks.steps.stepLabel", { index: step.position })}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                    {step.tip}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">{t("howItWorks.behind.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("howItWorks.behind.subtitle")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {behindScenes.map(({ key, title, description, Icon, iconLabel }) => (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" role="img" aria-label={iconLabel}>
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/60 py-20">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                {t("howItWorks.pilot.badge")}
              </span>
              <h2 className="mt-5 text-3xl font-bold text-foreground md:text-4xl">{t("howItWorks.pilot.title")}</h2>
              <p className="mt-4 text-muted-foreground">{t("howItWorks.pilot.description")}</p>
              <div className="mt-8 space-y-5">
                {earlyAccessHighlights.map(({ key, title, description, Icon, iconLabel }) => (
                  <div
                    key={key}
                    className="flex items-start gap-4 rounded-2xl border border-muted-foreground/15 bg-white p-5 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" role="img" aria-label={iconLabel}>
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                      <p className="mt-2 text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-200/40">
              <h3 className="text-2xl font-semibold text-foreground">{t("howItWorks.pilot.ctaTitle")}</h3>
              <p className="mt-3 text-muted-foreground">{t("howItWorks.pilot.ctaSubtitle")}</p>
              <div className="mt-8 space-y-3">
                <Button asChild variant="cta" className="w-full">
                  <Link to="/provider/setup">{t("howItWorks.pilot.primaryCta")}</Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="w-full"
                >
                  <a href="mailto:hello@kitloop.cz">{t("howItWorks.pilot.secondaryCta")}</a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("howItWorks.pilot.contactNote")}</p>
            </div>
          </div>
        </div>
      </section>

      <StickyCta scrollToSteps={scrollToSteps} />
    </div>
  );
};

const StickyCta: React.FC<{ scrollToSteps: () => void }> = ({ scrollToSteps }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (pathname.startsWith("/how-it-works")) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <nav
        aria-label={t("howItWorks.stickyCta.ariaLabel")}
        className="pointer-events-auto mx-auto max-w-4xl rounded-2xl bg-emerald-900/95 p-4 shadow-2xl ring-1 ring-emerald-500/40 backdrop-blur"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-emerald-50">{t("howItWorks.stickyCta.message")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {marketplaceEnabled && (
              <Button asChild variant="cta" size="cta">
                <Link
                  to="/browse"
                  aria-label="Browse gear"
                  data-cta="browse-gear"
                >
                  {t("howItWorks.stickyCta.primary")}
                </Link>
              </Button>
            )}
            <Button size="cta" variant="outline" className="border-white/40 text-white hover:bg-white/10" onClick={scrollToSteps} type="button">
              {t("howItWorks.stickyCta.secondary")}
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default HowItWorks;
