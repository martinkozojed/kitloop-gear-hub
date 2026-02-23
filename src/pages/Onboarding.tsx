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

interface PainItem   { key: Pain; label: string; }
interface FlowStep   { title: string; desc: string; bullets: string[]; }
interface Feature    { key: string; title: string; desc: string; large: boolean; }
interface PilotStep  { num: string; title: string; desc: string; }
interface FAQ        { q: string; a: string; }

// ─── Static icon maps (icons can't live in JSON) ──────────────────────────────

const painIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  counter:   ClipboardList,
  exports:   FileSpreadsheet,
};

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory:    Package,
  reservations: CalendarCheck,
  counter:      QrCode,
  dashboard:    LayoutDashboard,
  exports:      FileSpreadsheet,
};

const flowStepIcons = [Package, CalendarCheck, QrCode];

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
  hidden:  { opacity: 0, y: 20 },
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

// ─── Hero UI preview panel ────────────────────────────────────────────────────
// Static illustrative data — purely decorative, aria-hidden.

function HeroPreview({ lang }: { lang: Lang }) {
  const today = new Date().toLocaleDateString(
    lang === "cs" ? "cs-CZ" : "en-US",
    { weekday: "short", month: "short", day: "numeric" },
  );

  const labels = lang === "cs"
    ? {
        kpi: ["Výdeje dnes", "Vratky dnes", "Po termínu", "Dostupné"],
        agendaLabel: "Dnešní agenda",
        typeOut: "výdej",
        typeRet: "vratka",
        disclaimer: "Ukázka rozhraní · ilustrativní data",
        agenda: [
          { time: "09:30", name: "Alex T. · E-bike ×2", type: "out" as const },
          { time: "11:00", name: "Sarah M. · Stan ×1",  type: "ret" as const },
          { time: "14:00", name: "James W. · Tyče ×2",  type: "out" as const },
        ],
      }
    : {
        kpi: ["Check-outs today", "Returns today", "Overdue", "Available"],
        agendaLabel: "Today's agenda",
        typeOut: "check-out",
        typeRet: "return",
        disclaimer: "UI preview · illustrative data",
        agenda: [
          { time: "09:30", name: "Alex T. · E-bike ×2",  type: "out" as const },
          { time: "11:00", name: "Sarah M. · Tent ×1",   type: "ret" as const },
          { time: "14:00", name: "James W. · Poles ×2",  type: "out" as const },
        ],
      };

  const kpiValues = ["4", "3", "1", "28"];

  return (
    <div
      className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white select-none pointer-events-none"
      aria-hidden="true"
    >
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{today}</span>
        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full tracking-wide">
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
        {kpiValues.map((val, i) => (
          <div key={i} className="px-4 py-3">
            <p className={cn("text-xl font-bold leading-none", i === 2 ? "text-amber-500" : "text-slate-900")}>
              {val}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{labels.kpi[i]}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {labels.agendaLabel}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {labels.agenda.map((item) => (
          <div key={item.time} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs font-mono text-slate-400 w-10 shrink-0">{item.time}</span>
            <span className="text-sm text-slate-700 flex-1 truncate">{item.name}</span>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                item.type === "out" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
              )}
            >
              {item.type === "out" ? labels.typeOut : labels.typeRet}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-4 py-2 bg-slate-50">
        <p className="text-[10px] text-slate-400 text-center">{labels.disclaimer}</p>
      </div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  f,
  highlighted,
  cardRef,
}: {
  f: Feature;
  highlighted: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const Icon = featureIcons[f.key];
  return (
    <div ref={cardRef}>
      <Card
        className={cn(
          "h-full rounded-xl border shadow-sm bg-white transition-all duration-300",
          highlighted && "ring-2 ring-emerald-500 border-emerald-200 shadow-md",
        )}
      >
        <CardContent className={cn("space-y-3", f.large ? "p-5" : "p-4")}>
          <div
            className={cn(
              "flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700",
              f.large ? "h-10 w-10" : "h-9 w-9",
            )}
          >
            {Icon && <Icon className={f.large ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />}
          </div>
          <div>
            <h3 className={cn("font-bold", f.large ? "text-base" : "text-sm")}>{f.title}</h3>
            <p className="mt-1 text-muted-foreground text-sm">{f.desc}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pain, setPain] = usePain();

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
  const tPains      = () => t("onboarding.pains",      { returnObjects: true }) as PainItem[];
  const tFlowSteps  = () => t("onboarding.flowSteps",  { returnObjects: true }) as FlowStep[];
  const tFeatures   = () => t("onboarding.features",   { returnObjects: true }) as Feature[];
  const tPilotSteps = () => t("onboarding.pilotSteps", { returnObjects: true }) as PilotStep[];
  const tPilotBoxItems = () => t("onboarding.pilotBoxItems", { returnObjects: true }) as string[];
  const tIsBullets  = () => t("onboarding.isBullets",  { returnObjects: true }) as string[];
  const tIsntBullets = () => t("onboarding.isntBullets", { returnObjects: true }) as string[];
  const tFaqs       = () => t("onboarding.faqs",       { returnObjects: true }) as FAQ[];

  const signupHref  = `/signup?from=onboarding&lang=${lang}`;
  const loginHref   = `/login?lang=${lang}`;
  const privacyHref = `/privacy?lang=${lang}`;

  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const featureRefs        = useRef<Record<string, HTMLDivElement | null>>({});
  const isFirstPainEffect  = useRef(true);

  useEffect(() => {
    if (isFirstPainEffect.current) {
      isFirstPainEffect.current = false;
      return;
    }
    if (!pain) return;
    const el     = featureRefs.current[pain];
    const target = el ?? featuresSectionRef.current;
    if (target) {
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
  }, [pain]);

  const handlePainClick = (key: Pain) => {
    const next = pain === key ? null : key;
    setPain(next);
    if (next) firePainEvent(next, lang);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Skip link */}
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:-translate-x-1/2 focus:z-[60] focus:bg-background focus:px-5 focus:py-2 focus:rounded-full focus:text-sm focus:font-semibold focus:ring-2 focus:ring-emerald-600 focus:shadow-lg"
      >
        {t("onboarding.painSkip")}
      </a>

      {/* ── Standalone header ────────────────────────────────────────────────── */}
      <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border sticky top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
            <span className="text-emerald-600 pr-0.5 tracking-tight">Kit</span>
            <span className="text-foreground tracking-wide">loop</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language toggle — single button showing the other language */}
            <button
              onClick={() => setLang(lang === "en" ? "cs" : "en")}
              aria-label={lang === "en" ? "Switch to Czech" : "Přepnout do angličtiny"}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 rounded px-0.5"
            >
              {lang === "en" ? "CS" : "EN"}
            </button>

            <Button variant="outline" size="sm" asChild className="min-w-[7.5rem] justify-center">
              <Link to={loginHref}>{t("onboarding.heroCta2")}</Link>
            </Button>
          </div>
        </div>
      </header>

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
              <p className="text-slate-500 leading-relaxed">{t("onboarding.heroSub")}</p>

              <div className="flex flex-col gap-3 pt-1">
                <Button
                  asChild
                  variant="cta"
                  size="cta"
                  onClick={() => fireCtaEvent("hero", lang, pain)}
                >
                  <Link to={signupHref}>{t("onboarding.heroCta1")}</Link>
                </Button>

                <button
                  type="button"
                  onClick={() => featuresSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className={cn(
                    "self-start rounded-xl border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground",
                    "transition-all hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                  )}
                >
                  {t("onboarding.heroCta3")} ↓
                </button>
              </div>
            </motion.div>

            {/* Right — static UI preview */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
              className="lg:pl-6"
            >
              <HeroPreview lang={lang} />
            </motion.div>

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
      <Section className="bg-slate-50/70 py-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="rounded-xl border border-emerald-200 bg-white shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <p className="text-base font-bold text-emerald-800">{t("onboarding.isTitle")}</p>
                </div>
                <ul className="space-y-2">
                  {tIsBullets().map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm text-foreground">
                      <span className="mt-0.5 text-emerald-600 shrink-0" aria-hidden="true">✓</span>
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

      {/* ── D) Jak to funguje ─────────────────────────────────────────────────── */}
      <Section className="bg-white py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.flowTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("onboarding.flowSub")}</p>
          </div>

          <div className="divide-y divide-slate-100">
            {tFlowSteps().map((step, i) => {
              const StepIcon = flowStepIcons[i];
              return (
                <div
                  key={step.title}
                  className="grid grid-cols-1 md:grid-cols-[64px_1fr_1fr] gap-x-8 gap-y-3 py-7 items-start"
                >
                  <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-0">
                    <span className="text-5xl font-black leading-none tabular-nums text-emerald-500/25 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                        {StepIcon && <StepIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                      </div>
                      <h3 className="text-base font-bold">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-[2.375rem]">{step.desc}</p>
                  </div>

                  <ul className="space-y-1.5 md:pt-0 pt-1">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── E) Funkce — Bento grid ────────────────────────────────────────────── */}
      <Section id="features" className="bg-slate-50/70 py-12 scroll-mt-24">
        <div className="mx-auto max-w-5xl px-6">
          <div ref={featuresSectionRef} className="text-center mb-8">
            <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.featuresTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("onboarding.featuresSub")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            {tFeatures()
              .filter((f) => f.large)
              .map((f) => (
                <FeatureCard
                  key={f.key}
                  f={f}
                  highlighted={pain === f.key}
                  cardRef={(el) => { featureRefs.current[f.key] = el; }}
                />
              ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {tFeatures()
              .filter((f) => !f.large)
              .map((f) => (
                <FeatureCard
                  key={f.key}
                  f={f}
                  highlighted={pain === f.key}
                  cardRef={(el) => { featureRefs.current[f.key] = el; }}
                />
              ))}
          </div>
        </div>
      </Section>

      {/* ── F) Pilot: Jak začít ──────────────────────────────────────────────── */}
      <Section className="bg-white py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.pilotTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("onboarding.pilotSub")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {tPilotSteps().map((step) => (
              <Card key={step.num} className="rounded-xl border shadow-sm bg-white">
                <CardContent className="p-5 space-y-2">
                  <span className="text-3xl font-black text-emerald-200 leading-none select-none" aria-hidden="true">
                    {step.num}
                  </span>
                  <h3 className="text-base font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-xl border-emerald-100 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <h3 className="font-bold text-sm">{t("onboarding.pilotBoxTitle")}</h3>
              </div>
              <ul className="space-y-1.5">
                {tPilotBoxItems().map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 text-emerald-500 shrink-0" aria-hidden="true">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── G) FAQ ───────────────────────────────────────────────────────────── */}
      <Section className="bg-slate-50/70 py-10">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold md:text-3xl mb-6">{t("onboarding.faqTitle")}</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {tFaqs().map((faq, i) => (
              <AccordionItem
                key={i}
                value={String(i)}
                className="rounded-xl border border-muted-foreground/15 px-5 overflow-hidden bg-white"
              >
                <AccordionTrigger className="text-left font-semibold py-3.5 hover:no-underline text-sm">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* ── H) Final CTA panel ──────────────────────────────────────────────── */}
      <section className="bg-emerald-50/70">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center space-y-5">
          <h2 className="text-3xl font-bold md:text-4xl text-slate-900">{t("onboarding.finalTitle")}</h2>
          <p className="text-slate-600">{t("onboarding.finalSub")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              variant="cta"
              size="cta"
              onClick={() => fireCtaEvent("final", lang, pain)}
            >
              <Link to={signupHref}>{t("onboarding.finalCta1")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:support@kitloop.cz">{t("onboarding.finalCta2")}</a>
            </Button>
          </div>
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
