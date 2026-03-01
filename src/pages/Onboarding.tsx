/**
 * /onboarding — Kitloop pilot gateway
 *
 * Standalone page (no Navbar/Footer). Language via i18next (synced from ?lang=cs|en on load).
 * Pain context via ?pain=inventory|counter|exports (URL param, preserved on navigation).
 * Primary goal: qualified pilot access request, not self-serve signup.
 *
 * Analytics hook points:
 *   window.addEventListener('kitloop:onboarding_cta_click', (e) => { ... });
 *   window.addEventListener('kitloop:onboarding_pain_select', (e) => { ... });
 */

import React, { useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Package,
  CalendarCheck,
  QrCode,
  LayoutDashboard,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ClipboardList,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = "cs" | "en";
type Pain = "inventory" | "counter" | "exports";

interface PainItem { key: Pain; label: string; }
interface TimelineStep { title: string; desc: string; }
interface WhatYouGetItem { title: string; desc: string; }
interface FAQ { q: string; a: string; }

// ─── Static icon maps (icons can't live in JSON) ──────────────────────────────

const painIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  counter: ClipboardList,
  exports: FileSpreadsheet,
};

const timelineIcons = [LayoutDashboard, Package, CalendarCheck, QrCode];

// ─── URL param hook — pain only ───────────────────────────────────────────────

function usePain(): [Pain | null, (p: Pain | null) => void] {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("pain");
  const pain: Pain | null =
    raw === "inventory" || raw === "counter" || raw === "exports" ? raw : null;

  const setPain = useCallback(
    (p: Pain | null) => {
      const next = new URLSearchParams(params);
      if (p) next.set("pain", p);
      else next.delete("pain");
      navigate({ search: next.toString() }, { replace: true });
    },
    [params, navigate],
  );

  return [pain, setPain];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function fireCtaEvent(placement: string, lang: string, pain: Pain | null) {
  window.dispatchEvent(
    new CustomEvent("kitloop:onboarding_cta_click", {
      detail: { placement, lang, pain },
    }),
  );
}

function firePainEvent(pain: Pain, lang: string) {
  window.dispatchEvent(
    new CustomEvent("kitloop:onboarding_pain_select", {
      detail: { pain, lang },
    }),
  );
}

// ─── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={shouldReduce ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Ambient glow layer ───────────────────────────────────────────────────────

function GlowLayer() {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-emerald-300/[0.10] blur-3xl"
        animate={{ x: [0, 35, 0], y: [0, -25, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 -left-24 w-[380px] h-[380px] rounded-full bg-emerald-400/[0.05] blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pain, setPain] = usePain();
  const shouldReduce = useReducedMotion();
  const { isAuthenticated, isProvider, isAdmin } = useAuth();

  // Derive lang from i18next (normalise to cs | en)
  const lang: Lang = i18n.language?.startsWith("cs") ? "cs" : "en";

  // On mount: sync ?lang= URL param → i18next (one-time)
  const langSynced = useRef(false);
  useEffect(() => {
    if (langSynced.current) return;
    langSynced.current = true;
    const paramLang = searchParams.get("lang");
    if (paramLang === "cs" || paramLang === "en") {
      i18n.changeLanguage(paramLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      i18n.changeLanguage(l);
      // Keep URL param in sync so shared links work
      const next = new URLSearchParams(searchParams);
      next.set("lang", l);
      navigate({ search: next.toString() }, { replace: true });
    },
    [i18n, searchParams, navigate],
  );

  // Helpers for typed array data from i18next
  const tPains = () => t("onboarding.pains", { returnObjects: true }) as PainItem[];
  const tHeroSteps = () => t("onboarding.heroSteps", { returnObjects: true }) as string[];
  const tTimelineSteps = () => t("onboarding.timelineSteps", { returnObjects: true }) as TimelineStep[];
  const tWhatYouGetItems = () => t("onboarding.whatYouGetItems", { returnObjects: true }) as WhatYouGetItem[];
  const tIsBullets = () => t("onboarding.isBullets", { returnObjects: true }) as string[];
  const tIsntBullets = () => t("onboarding.isntBullets", { returnObjects: true }) as string[];
  const tFaqs = () => t("onboarding.faqs", { returnObjects: true }) as FAQ[];

  const signupHref = `/signup?from=onboarding&lang=${lang}`;
  const loginHref = `/login?lang=${lang}`;
  const privacyHref = `/privacy?lang=${lang}`;

  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const isFirstPainEffect = useRef(true);

  useEffect(() => {
    if (isFirstPainEffect.current) {
      isFirstPainEffect.current = false;
      return;
    }
    if (!pain) return;
    const target = featuresSectionRef.current;
    if (target) {
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, [pain]);

  const handlePainClick = (key: Pain) => {
    const next = pain === key ? null : key;
    setPain(next);
    if (next) firePainEvent(next, lang);
  };

  return (
    <div className="light min-h-screen bg-background text-foreground">

      {/* Skip link */}
      <a
        href="#section-features"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:-translate-x-1/2 focus:z-[60] focus:bg-background focus:px-5 focus:py-2 focus:rounded-full focus:text-sm focus:font-semibold focus:ring-2 focus:ring-emerald-600 focus:shadow-lg"
      >
        {t("onboarding.painSkip")}
      </a>

      {!isAuthenticated && (
        <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border sticky top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
              <span className="text-emerald-600 pr-0.5 tracking-tight">Kit</span>
              <span className="text-foreground tracking-wide">loop</span>
            </Link>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />

              <Button variant="outline" size="sm" asChild className="min-w-[7.5rem] justify-center">
                <Link to={loginHref}>{t("onboarding.heroCta2")}</Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* ── A) Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
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
                {tHeroSteps().map((step) => (
                  <li key={step} className="flex gap-2.5 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 pt-2">
                {(isProvider || isAdmin) ? (
                  <Button
                    asChild
                    variant="cta"
                    size="cta"
                    className="w-full sm:w-auto"
                  >
                    <Link to="/provider/dashboard">{lang === "en" ? "Go to Dashboard" : "Přejít do dashboardu"}</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="cta"
                    size="cta"
                    className="w-full sm:w-auto"
                    onClick={() => fireCtaEvent("hero", lang, pain)}
                  >
                    <Link to={signupHref}>{t("onboarding.heroCta1")}</Link>
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => featuresSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
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
                {/* Real proof asset placeholder */}
                <video
                  autoPlay={!shouldReduce}
                  loop
                  muted
                  playsInline
                  preload="none"
                  aria-label="Kitloop operations interface preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  poster="/onboarding/hero-loop-poster.jpg"
                >
                  <source src="/onboarding/hero-loop-proof.mp4" type="video/mp4" />
                  <img
                    src="/onboarding/hero-loop-poster.jpg"
                    alt="Kitloop operations interface preview fallback"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </video>
                {/* Fallback container if video fails */}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 -z-10">
                  <p className="text-sm font-medium text-slate-500">Video Proof Loading...</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── B) Pain selector ─────────────────────────────────────────────────── */}
      <Section className="bg-white py-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.painTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("onboarding.painSub")}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label={t("onboarding.painTitle")}>
            {tPains().map(({ key, label }) => {
              const Icon = painIcons[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={pain === key}
                  onClick={() => handlePainClick(key)}
                  className={cn(
                    "group rounded-xl border-2 p-4 text-left transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                    pain === key
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50",
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                      pain === key
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-700",
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold leading-snug whitespace-pre-line",
                      pain === key ? "text-emerald-800" : "text-foreground",
                    )}
                  >
                    {label}
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 text-xs font-medium flex items-center gap-1 transition-opacity",
                      pain === key ? "text-emerald-600 opacity-100" : "opacity-0",
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

      {/* ── C) Je / Není pro ──────────────────────────────────────────────────── */}
      <Section className="bg-subtle py-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="rounded-token-lg border-0 bg-inverse shadow-elevated">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-inverse-foreground/80 shrink-0" aria-hidden="true" />
                  <p className="text-base font-bold text-inverse-foreground">{t("onboarding.isTitle")}</p>
                </div>
                <ul className="space-y-2">
                  {tIsBullets().map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm text-inverse-foreground">
                      <span className="mt-0.5 text-inverse-foreground/70 shrink-0" aria-hidden="true">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <p className="text-base font-bold text-slate-600">{t("onboarding.isntTitle")}</p>
                </div>
                <ul className="space-y-2">
                  {tIsntBullets().map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">✗</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      {/* ── D) První hodina (Timeline) ────────────────────────────────────────── */}
      <Section id="section-features" className="bg-white py-12 scroll-mt-24">
        <div ref={featuresSectionRef} className="mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.timelineTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("onboarding.timelineSub")}</p>
          </div>

          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] items-center">
            {/* Left: Steps */}
            <div className="space-y-8">
              {tTimelineSteps().map((step, i) => {
                const StepIcon = timelineIcons[i] || Package;
                return (
                  <div key={i} className="flex flex-row items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                      <StepIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Media Proof */}
            <div className="relative rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-slate-50 aspect-[4/3] flex items-center justify-center">
              {/* Real proof asset placeholder */}
              <video
                autoPlay={!shouldReduce}
                loop
                muted
                playsInline
                preload="none"
                aria-label="Timeline operations proof"
                className="absolute inset-0 w-full h-full object-cover"
                poster="/onboarding/timeline-loop-poster.jpg"
              >
                <source src="/onboarding/timeline-loop-proof.mp4" type="video/mp4" />
                <img
                  src="/onboarding/timeline-loop-poster.jpg"
                  alt="Timeline operations proof fallback"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </video>
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 -z-10">
                <p className="text-sm font-medium text-slate-500">Timeline Proof Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── E) What you get in the pilot (Concierge) ────────────────────────── */}
      <Section className="bg-subtle py-12 border-y border-slate-100">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.whatYouGetTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("onboarding.whatYouGetSub")}</p>
          </div>

          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
            {/* Left: Feature Screenshot */}
            <div className="relative rounded-xl border border-slate-200 shadow-xl overflow-hidden bg-slate-50 aspect-[4/3] flex items-center justify-center order-2 lg:order-1">
              <img
                src="/onboarding/features-proof-screenshot.jpg"
                alt="Kitloop Interface Screenshot"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 -z-10">
                <p className="text-sm font-medium text-slate-500">Screenshot Proof Loading...</p>
              </div>
            </div>

            {/* Right: Bullet points */}
            <div className="grid gap-4 order-1 lg:order-2">
              {tWhatYouGetItems().map((item, i) => (
                <Card key={i} className="rounded-xl border shadow-sm bg-white">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center gap-2.5 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <h3 className="font-bold text-sm">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-[1.625rem]">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── F) Trust Block ─────────────────────────────────────────────────── */}
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

      {/* ── G) FAQ ───────────────────────────────────────────────────────────── */}
      <Section className="bg-subtle py-10">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold md:text-3xl mb-6">{t("onboarding.faqTitle")}</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {tFaqs().map((faq, i) => (
              <AccordionItem
                key={i}
                value={String(i)}
                className="group rounded-token-lg border border-muted-foreground/15 px-5 overflow-hidden bg-white transition-all data-[state=open]:bg-inverse data-[state=open]:border-transparent data-[state=open]:shadow-elevated"
              >
                <AccordionTrigger className="text-left font-semibold py-3.5 hover:no-underline text-sm group-data-[state=open]:text-inverse-foreground [&[data-state=open]>svg]:text-inverse-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground group-data-[state=open]:text-inverse-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* ── H) Final CTA panel ──────────────────────────────────────────────── */}
      <section className="py-14 px-6">
        <div className="mx-auto max-w-2xl rounded-token-xl bg-inverse px-10 py-12 text-center space-y-5 shadow-elevated">
          <h2 className="text-2xl font-bold md:text-3xl text-inverse-foreground">{t("onboarding.finalTitle")}</h2>
          <p className="text-inverse-foreground/90 text-sm">{t("onboarding.finalSub")}</p>
          <Button
            asChild
            variant="cta"
            size="cta"
            onClick={() => fireCtaEvent("final", lang, pain)}
          >
            <Link to={signupHref}>{t("onboarding.finalCta1")}</Link>
          </Button>
        </div>
      </section>

      {/* ── Footer strip ─────────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-sm text-muted-foreground">
        <span>{t("onboarding.footerContact")}</span>
        <Link
          to={privacyHref}
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {t("onboarding.footerPrivacy")}
        </Link>
      </footer>
    </div>
  );
}
