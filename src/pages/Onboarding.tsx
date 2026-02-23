/**
 * /onboarding — Kitloop pilot gateway
 *
 * Standalone page (no Navbar/Footer). Language via ?lang=cs|en.
 * Pain context via ?pain=inventory|counter|exports (preserved alongside lang).
 * Primary goal: qualified pilot access request, not self-serve signup.
 *
 * Analytics hook points — wire up to GA4 / Mixpanel / PostHog as needed:
 *
 *   window.addEventListener('kitloop:onboarding_cta_click', (e) => {
 *     const { placement, lang, pain } = e.detail;
 *     ga('event', 'onboarding_cta_click', { placement, lang, pain });
 *   });
 *
 *   window.addEventListener('kitloop:onboarding_pain_select', (e) => {
 *     const { pain, lang } = e.detail;
 *     ga('event', 'onboarding_pain_select', { pain, lang });
 *   });
 *
 *   window.addEventListener('kitloop:onboarding_demo_complete', (e) => {
 *     const { lang } = e.detail;
 *     ga('event', 'onboarding_demo_complete', { lang });
 *   });
 */

import React, { useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
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

// ─── URL param hooks ──────────────────────────────────────────────────────────
// Both hooks read from the same URLSearchParams and always preserve all params.

function useLang(): [Lang, (l: Lang) => void] {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("lang");
  const lang: Lang = raw === "en" ? "en" : "cs";

  const setLang = useCallback(
    (l: Lang) => {
      const next = new URLSearchParams(params); // preserves pain, from, etc.
      next.set("lang", l);
      navigate({ search: next.toString() }, { replace: true });
    },
    [params, navigate],
  );

  return [lang, setLang];
}

function usePain(): [Pain | null, (p: Pain | null) => void] {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("pain");
  const pain: Pain | null =
    raw === "inventory" || raw === "counter" || raw === "exports" ? raw : null;

  const setPain = useCallback(
    (p: Pain | null) => {
      const next = new URLSearchParams(params); // preserves lang, from, etc.
      if (p) next.set("pain", p);
      else next.delete("pain");
      navigate({ search: next.toString() }, { replace: true });
    },
    [params, navigate],
  );

  return [pain, setPain];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function fireCtaEvent(placement: string, lang: Lang, pain: Pain | null) {
  window.dispatchEvent(
    new CustomEvent("kitloop:onboarding_cta_click", {
      detail: { placement, lang, pain },
    }),
  );
}

function firePainEvent(pain: Pain, lang: Lang) {
  window.dispatchEvent(
    new CustomEvent("kitloop:onboarding_pain_select", {
      detail: { pain, lang },
    }),
  );
}


// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  cs: {
    heroBadge: "MVP • Pilot • Ruční schválení",
    heroH1: "Provozní systém pro půjčovny.",
    heroH2: "Inventář → interní rezervace → výdej/vratka → přehled → export/print.",
    heroSub:
      "Pilot pro vybrané půjčovny. Ruční schválení, osobní onboarding. Stavíme to s prvními provozy.",
    heroCta1: "Požádat o pilotní přístup",
    heroCta2: "Přihlásit se",
    heroMicro:
      "Zákazníci zatím sami nerezervují — rezervace zakládá staff. Platby/refundy nejsou součást core flow.",

    painTitle: "Co vás pálí nejvíc?",
    painSub: "Vyberte, co nejvíc sedí — ukážeme vám, co s tím Kitloop dělá.",
    painSkip: "Přeskočit na funkce",
    pains: [
      { key: "inventory" as Pain, label: "Ztrácím přehled\no vybavení", icon: Package },
      { key: "counter" as Pain, label: "Na pultu je chaos\npři výdeji/vratce", icon: ClipboardList },
      { key: "exports" as Pain, label: "Excel/CSV, exporty\na tisk mě ničí", icon: FileSpreadsheet },
    ],

    isTitle: "Je pro",
    isntTitle: "Není pro (zatím)",
    isBullets: [
      "Půjčovny, kde rezervace vzniká interně (walk-in / telefon / email)",
      "Provozy, co chtějí zrychlit issue/return a snížit chyby",
      "Týmový provoz (role, přístup, evidence)",
    ],
    isntBullets: [
      "Instant online booking pro zákazníky",
      "Platby/refundy jako součást core flow",
      "Hodinové sloty / opening-hours logika / komplexní pricing",
    ],

    flowTitle: "Jak to funguje dnes",
    flowSub: "Tři kroky, žádná složitost navíc.",
    flowSteps: [
      {
        title: "Inventář",
        desc: "Evidence všeho, co půjčujete — od kusů po stav.",
        bullets: ["Stav každé položky (dostupné / rezervováno / servis)", "Kategorie, varianty, import z CSV"],
        icon: Package,
      },
      {
        title: "Interní rezervace",
        desc: "Staff zakládá rezervace přímo v systému.",
        bullets: ["Termíny, stavy, přiřazení vybavení", "Přehled dne — co se vydává, co se vrací"],
        icon: CalendarCheck,
      },
      {
        title: "Výdej / Vratka + print/export",
        desc: "Operace u pultu bez papírů.",
        bullets: ["Fotodokumentace, evidence depozitu a poznámek", "Tisk předávacího protokolu, export CSV"],
        icon: QrCode,
      },
    ],

    featuresTitle: "Co konkrétně dostanete",
    featuresSub: "MVP funkce, které jsou dnes live.",
    features: [
      { key: "inventory", title: "Inventář", desc: "Evidence kusů, stavů a kategorií. Import z CSV pro rychlý start.", icon: Package, large: true },
      { key: "reservations", title: "Interní rezervace", desc: "Staff zakládá rezervace, sleduje termíny a stavy. Přehled dne.", icon: CalendarCheck, large: true },
      { key: "counter", title: "Výdej / Vratka", desc: "Operace u pultu s fotodokumentací a evidencí depozitu.", icon: QrCode, large: false },
      { key: "dashboard", title: "Provozní přehled", desc: "Dnešní výdeje, vratky, pozdní — vše na jednom místě.", icon: LayoutDashboard, large: false },
      { key: "exports", title: "Print + Export", desc: "Tisk předávacího protokolu. Export dat do CSV.", icon: FileSpreadsheet, large: false },
    ],

    pilotTitle: "Jak se do pilotu zapojit",
    pilotSub: "Tři kroky. Bez závazku.",
    pilotSteps: [
      { num: "01", title: "Požádejte o přístup", desc: "Krátká žádost — typ půjčovny, kontakt, pár vět o provozu." },
      { num: "02", title: "Ruční schválení + call", desc: "Ověříme fit s MVP a domluvíme onboarding." },
      { num: "03", title: "Import inventáře + spuštění", desc: "Osobní onboarding. Projdeme vše krok za krokem." },
    ],
    pilotBoxTitle: "Co budeme chtít od vás",
    pilotBoxItems: [
      "Typ půjčovny + přibližný počet položek inventáře",
      "Jak dnes vznikají rezervace (walk-in, telefon, Excel…)",
      "Excel/CSV (pokud máte), nebo začneme s pár položkami",
    ],
    pilotCta: "Požádat o pilotní přístup",

    faqTitle: "Časté dotazy",
    faqs: [
      { q: "Umí to online rezervace pro zákazníky?", a: "Ne. MVP je provider-only — zákazníci zatím sami nerezervují, rezervace zakládá staff. Po pilotu zvažujeme \"Request Link\", přes který by zákazník mohl poslat poptávku." },
      { q: "Co znamená ruční schválení?", a: "Hlídáme kapacitu onboardingu a chceme znát provoz, se kterým pracujeme. Není to byrokracie — je to zárukou, že každé spuštění dopadne dobře." },
      { q: "Jak dostanu data z Excelu do systému?", a: "Kitloop podporuje import inventáře z CSV. Při onboardingu vám s převodem pomůžeme." },
      { q: "Jak dlouho trvá začít?", a: "Záleží na rozsahu inventáře. Provedeme vás krok za krokem — importujeme data, projdeme workflow a zajistíme, že tým je připravený." },
      { q: "Platby a kauce?", a: "Evidence depozitu a poznámky jsou součástí procesu výdeje. Platební transakce (online platby, refundy) nejsou součástí core flow v aktuálním MVP." },
    ],

    finalTitle: "Chcete být mezi prvními piloty?",
    finalSub: "Ruční schválení. Osobní onboarding. Provider-only MVP.",
    finalCta1: "Požádat o pilotní přístup",
    finalCta2: "Napsat nám",

    showingFeatures: "Zobrazuji funkce",
    footerContact: "Kontakt: support@kitloop.cz",
    footerPrivacy: "Ochrana soukromí",
  },

  en: {
    heroBadge: "MVP • Pilot • Manual approval",
    heroH1: "Operations system for rental shops.",
    heroH2: "Inventory → internal reservations → issue/return → overview → export/print.",
    heroSub:
      "Pilot for selected rental shops. Manual approval, personal onboarding. Built with the first operators.",
    heroCta1: "Request pilot access",
    heroCta2: "Sign in",
    heroMicro:
      "Customers don't self-book yet — reservations are created by staff. Payments/refunds are not part of the core flow.",

    painTitle: "What's your biggest pain?",
    painSub: "Pick what fits most — we'll show you what Kitloop does about it.",
    painSkip: "Skip to features",
    pains: [
      { key: "inventory" as Pain, label: "I'm losing track\nof my inventory", icon: Package },
      { key: "counter" as Pain, label: "Counter chaos\nduring issue/return", icon: ClipboardList },
      { key: "exports" as Pain, label: "Excel/CSV, exports\nand printing kill me", icon: FileSpreadsheet },
    ],

    isTitle: "Is for",
    isntTitle: "Is not for (yet)",
    isBullets: [
      "Rental shops where reservations are created internally (walk-in / phone / email)",
      "Operations that want to speed up issue/return and reduce errors",
      "Team operations (roles, access, records)",
    ],
    isntBullets: [
      "Instant online booking for customers",
      "Payments/refunds as part of the core flow",
      "Hourly slots / opening-hours logic / complex pricing",
    ],

    flowTitle: "How it works today",
    flowSub: "Three steps. No added complexity.",
    flowSteps: [
      { title: "Inventory", desc: "Track everything you rent — from individual items to their status.", bullets: ["Item status (available / reserved / maintenance)", "Categories, variants, CSV import"], icon: Package },
      { title: "Internal reservations", desc: "Staff creates reservations directly in the system.", bullets: ["Dates, statuses, equipment assignment", "Today's overview — what's going out, what's coming back"], icon: CalendarCheck },
      { title: "Issue / Return + print/export", desc: "Counter operations without paperwork.", bullets: ["Photo documentation, deposit and notes tracking", "Print handover protocol, CSV export"], icon: QrCode },
    ],

    featuresTitle: "What you get",
    featuresSub: "MVP features live today.",
    features: [
      { key: "inventory", title: "Inventory", desc: "Track items, statuses and categories. CSV import for a quick start.", icon: Package, large: true },
      { key: "reservations", title: "Internal reservations", desc: "Staff creates reservations, tracks dates and statuses. Today's overview.", icon: CalendarCheck, large: true },
      { key: "counter", title: "Issue / Return", desc: "Counter operations with photo documentation and deposit tracking.", icon: QrCode, large: false },
      { key: "dashboard", title: "Operations overview", desc: "Today's issues, returns, late items — all in one place.", icon: LayoutDashboard, large: false },
      { key: "exports", title: "Print + Export", desc: "Print handover protocol. Export data to CSV.", icon: FileSpreadsheet, large: false },
    ],

    pilotTitle: "How to join the pilot",
    pilotSub: "Three steps. No commitment.",
    pilotSteps: [
      { num: "01", title: "Request access", desc: "Short application — type of shop, contact, a few words about your operation." },
      { num: "02", title: "Manual approval + call", desc: "We verify the fit with the MVP and schedule onboarding." },
      { num: "03", title: "Import inventory + launch", desc: "Personal onboarding. We'll guide you through it step by step." },
    ],
    pilotBoxTitle: "What we'll need from you",
    pilotBoxItems: [
      "Type of rental shop + approximate number of inventory items",
      "How reservations are created today (walk-in, phone, Excel…)",
      "Excel/CSV (if you have it), or we start with a few items",
    ],
    pilotCta: "Request pilot access",

    faqTitle: "FAQ",
    faqs: [
      { q: "Does it support online reservations for customers?", a: "No. The MVP is provider-only — customers don't self-book yet, reservations are created by staff. After the pilot we're considering a \"Request Link\" so customers can submit a request." },
      { q: "What does manual approval mean?", a: "We manage onboarding capacity and want to know the operation we're working with. It's not bureaucracy — it's our guarantee that every launch goes well." },
      { q: "How do I get my Excel data into the system?", a: "Kitloop supports CSV import for inventory. We'll help you with the conversion during onboarding." },
      { q: "How long does it take to get started?", a: "Depends on the size of your inventory. We'll guide you through it step by step — importing data, reviewing the workflow, and making sure your team is ready." },
      { q: "Payments and deposits?", a: "Deposit tracking and notes are part of the issue flow. Payment transactions (online payments, refunds) are not part of the core MVP flow." },
    ],

    finalTitle: "Want to be among the first pilots?",
    finalSub: "Manual approval. Personal onboarding. Provider-only MVP.",
    finalCta1: "Request pilot access",
    finalCta2: "Contact us",

    showingFeatures: "Showing features",
    footerContact: "Contact: support@kitloop.cz",
    footerPrivacy: "Privacy notice",
  },
} as const;

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
// Two large blurred emerald orbs that drift slowly in the background.
// Renders nothing when prefers-reduced-motion is active.

function GlowLayer() {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-emerald-300/20 blur-3xl"
        animate={{ x: [0, 35, 0], y: [0, -25, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 -left-24 w-[380px] h-[380px] rounded-full bg-emerald-400/15 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}


// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  f,
  highlighted,
  cardRef,
}: {
  f: { key: string; title: string; desc: string; icon: React.ComponentType<{ className?: string }>; large: boolean };
  highlighted: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={cardRef}>
      <Card
        className={cn(
          "h-full rounded-2xl border shadow-sm bg-white transition-all duration-300",
          highlighted && "ring-2 ring-emerald-500 border-emerald-200 shadow-md",
        )}
      >
        <CardContent className={cn("space-y-4", f.large ? "p-6" : "p-5")}>
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700",
              f.large ? "h-12 w-12" : "h-10 w-10",
            )}
          >
            <f.icon className={f.large ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
          </div>
          <div>
            <h3 className={cn("font-bold", f.large ? "text-xl" : "text-base")}>{f.title}</h3>
            <p className={cn("mt-1 text-muted-foreground", f.large ? "text-base mt-2" : "text-sm")}>
              {f.desc}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [lang, setLang] = useLang();
  const [pain, setPain] = usePain();
  const t = copy[lang];

  const signupHref = `/signup?from=onboarding&lang=${lang}`;
  const loginHref = `/login?lang=${lang}`;
  const privacyHref = `/privacy?lang=${lang}`;

  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const featureRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isFirstPainEffect = useRef(true);

  // Scroll to highlighted feature card on pain change.
  // Skip on initial mount so a shared URL (?pain=X) doesn't auto-jump.
  useEffect(() => {
    if (isFirstPainEffect.current) {
      isFirstPainEffect.current = false;
      return;
    }
    if (!pain) return;
    const el = featureRefs.current[pain];
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

      {/* Skip link — positioned at document top, visible on focus */}
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:-translate-x-1/2 focus:z-[60] focus:bg-background focus:px-5 focus:py-2 focus:rounded-full focus:text-sm focus:font-semibold focus:ring-2 focus:ring-emerald-600 focus:shadow-lg"
      >
        {t.painSkip}
      </a>

      {/* ── Standalone header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/40">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between w-full">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold flex items-center shrink-0">
            <span className="text-emerald-600 pr-0.5 tracking-tight">Kit</span>
            <span className="text-foreground tracking-wide">loop</span>
          </Link>

          {/* Right: CS/EN toggle + sign in */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1" role="group" aria-label={lang === "cs" ? "Jazyk" : "Language"}>
              {(["cs", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                    lang === l
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-transparent text-muted-foreground border-border hover:border-slate-400 hover:text-foreground",
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <Link
              to={loginHref}
              className={cn(
                "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
              )}
            >
              {t.heroCta2}
            </Link>
          </div>
        </div>
      </header>

      {/* ── A) Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <GlowLayer />
        <div className="relative mx-auto max-w-2xl px-6 py-14 md:py-20 text-center">
          <motion.div
            initial={{ opacity: 1, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-5"
          >
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 border border-emerald-100">
              {t.heroBadge}
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl text-foreground">
              {t.heroH1}
            </h1>
            <p className="text-base font-medium text-slate-700">{t.heroH2}</p>
            <p className="text-slate-500 leading-relaxed">{t.heroSub}</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center pt-1">
              <Button
                asChild
                variant="cta"
                size="cta"
                onClick={() => fireCtaEvent("hero", lang, pain)}
              >
                <Link to={signupHref}>{t.heroCta1}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={loginHref}>{t.heroCta2}</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-sm mx-auto">
              {t.heroMicro}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── B) Pain selector ─────────────────────────────────────────────────── */}
      <Section className="bg-white py-14">
          <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold md:text-3xl">{t.painTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.painSub}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="group" aria-label={t.painTitle}>
            {t.pains.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={pain === key}
                onClick={() => handlePainClick(key)}
                className={cn(
                  "group rounded-2xl border-2 p-6 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                  pain === key
                    ? "border-emerald-500 bg-emerald-50 shadow-md"
                    : "border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50",
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                    pain === key
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-700",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p
                  className={cn(
                    "font-semibold leading-snug whitespace-pre-line",
                    pain === key ? "text-emerald-800" : "text-foreground",
                  )}
                >
                  {label}
                </p>
                <p
                  className={cn(
                    "mt-2 text-xs font-medium flex items-center gap-1 transition-opacity",
                    pain === key ? "text-emerald-600 opacity-100" : "opacity-0",
                  )}
                  aria-hidden={pain !== key}
                >
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  {t.showingFeatures}
                </p>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── C) Je / Není pro ──────────────────────────────────────────────────── */}
      <Section className="bg-slate-50/70 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
              <CardContent className="p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <p className="text-lg font-bold text-emerald-800">{t.isTitle}</p>
                </div>
                <ul className="space-y-3">
                  {t.isBullets.map((b) => (
                    <li key={b} className="flex gap-3 text-base text-foreground">
                      <span className="mt-1 text-emerald-600 shrink-0" aria-hidden="true">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-slate-400 shrink-0" aria-hidden="true" />
                  <p className="text-lg font-bold text-slate-600">{t.isntTitle}</p>
                </div>
                <ul className="space-y-3">
                  {t.isntBullets.map((b) => (
                    <li key={b} className="flex gap-3 text-base text-muted-foreground">
                      <span className="mt-1 shrink-0 text-slate-400" aria-hidden="true">✗</span>
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
      <Section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold md:text-3xl">{t.flowTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.flowSub}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {t.flowSteps.map((step, i) => (
              <div key={step.title} className="relative">
                {i < t.flowSteps.length - 1 && (
                  <div
                    className="hidden md:flex absolute -right-3 top-8 z-10 items-center"
                    aria-hidden="true"
                  >
                    <ArrowRight className="h-5 w-5 text-emerald-400" />
                  </div>
                )}
                <Card className="h-full rounded-2xl border shadow-sm bg-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <step.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-1">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <h3 className="text-lg font-bold">{step.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {step.bullets.map((b) => (
                        <li key={b} className="flex gap-2 text-sm text-foreground">
                          <span className="mt-0.5 text-emerald-500 shrink-0" aria-hidden="true">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── E) Funkce — Bento grid ────────────────────────────────────────────── */}
      <Section id="features" className="bg-white py-16 scroll-mt-24">
        <div className="mx-auto max-w-5xl px-6">
          <div ref={featuresSectionRef} className="text-center mb-12">
            <h2 className="text-2xl font-bold md:text-3xl">{t.featuresTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.featuresSub}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 mb-5">
            {t.features
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

          <div className="grid gap-5 md:grid-cols-3">
            {t.features
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
      <Section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold md:text-3xl">{t.pilotTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.pilotSub}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {t.pilotSteps.map((step) => (
              <Card key={step.num} className="rounded-2xl border shadow-sm bg-white">
                <CardContent className="p-6 space-y-3">
                  <span className="text-4xl font-black text-emerald-200 leading-none select-none" aria-hidden="true">
                    {step.num}
                  </span>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl border-emerald-100 bg-white shadow-sm mb-10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
                <h3 className="font-bold">{t.pilotBoxTitle}</h3>
              </div>
              <ul className="space-y-2">
                {t.pilotBoxItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <span className="mt-0.5 text-emerald-500 shrink-0" aria-hidden="true">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center">
            <Button
              asChild
              variant="cta"
              size="cta"
              onClick={() => fireCtaEvent("pilot-section", lang, pain)}
            >
              <Link to={signupHref}>{t.pilotCta}</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ── G) FAQ ───────────────────────────────────────────────────────────── */}
      <Section className="bg-white py-14">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold md:text-3xl mb-8">{t.faqTitle}</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {t.faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={String(i)}
                className="rounded-2xl border border-muted-foreground/15 px-5 overflow-hidden"
              >
                <AccordionTrigger className="text-left font-semibold py-4 hover:no-underline text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-5 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      {/* ── H) Final CTA panel ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-emerald-50/70">
        <GlowLayer />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center space-y-6">
          <h2 className="text-3xl font-bold md:text-4xl text-slate-900">{t.finalTitle}</h2>
          <p className="text-slate-600 text-lg">{t.finalSub}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              variant="cta"
              size="cta"
              onClick={() => fireCtaEvent("final", lang, pain)}
            >
              <Link to={signupHref}>{t.finalCta1}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:support@kitloop.cz">{t.finalCta2}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer strip ─────────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-5xl px-6 py-8 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-sm text-muted-foreground">
        <span>{t.footerContact}</span>
        <Link
          to={privacyHref}
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {t.footerPrivacy}
        </Link>
      </footer>
    </div>
  );
}
