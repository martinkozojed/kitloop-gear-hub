import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Lang = "cs" | "en";

function useLang(): [Lang, (l: Lang) => void] {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("lang");
  const lang: Lang = raw === "en" ? "en" : "cs";

  const setLang = (l: Lang) => {
    const next = new URLSearchParams(params);
    next.set("lang", l);
    navigate({ search: next.toString() }, { replace: true });
  };

  return [lang, setLang];
}

const copy = {
  cs: {
    h1: "Inventář a rezervace pro půjčovny",
    sub: "B2B aplikace pro správu vybavení, rezervací a předání/vrácení v půjčovně outdoor vybavení.",
    cta1: "Zaregistrovat půjčovnu",
    cta2: "Přihlásit se",
    micro: "Každou žádost procházíme osobně, abychom znali své partnery. Dotazy: support@kitloop.cz.",
    screenshotCaption: "Screenshot coming soon",
    isTitle: "Je",
    isntTitle: "Není",
    isBullets: [
      "pro firmy a OSVČ, které půjčují outdoor vybavení.",
      "pro interní provoz (inventář, rezervace, výdej, vratky).",
    ],
    isntBullets: [
      "veřejný marketplace ani srovnávač půjčoven (zatím).",
      "automaticky otevřené bez schválení poskytovatele.",
    ],
    productTitle: "Jak to vypadá v praxi",
    productLines: [
      "V aplikaci spravuješ vybavení a vytváříš rezervace.",
      "Při výdeji a vrácení eviduješ stav a můžeš vytisknout předávací protokol.",
      "Data jsou oddělená mezi půjčovnami.",
    ],
    roadmapTitle: "Na čem zrovna pracujeme",
    roadmapIntro:
      "Kitloop vyvíjíme postupně a otevřeně — funkce ladíme s prvními půjčovnami.",
    roadmapCards: [
      {
        label: "Dnes",
        text: "inventář, rezervace, výdej/vratka, tisk protokolu, export CSV.",
      },
      {
        label: "Teď",
        text: "onboarding pilotních půjčoven a sběr zpětné vazby.",
      },
      {
        label: "Směr",
        text: "pokud se zapojí dost schválených půjčoven, chceme umožnit i veřejné vyhledávání vybavení (bez slibovaných termínů).",
      },
    ],
    howTitle: "Jak začít",
    steps: [
      "Zaregistruj účet pro správu půjčovny.",
      "Vyplň profil poskytovatele.",
      "Odešli žádost ke schválení.",
    ],
    howMicro: "Přístup do aplikace se zpřístupní po ručním schválení poskytovatele.",
    faqTitle: "Časté dotazy",
    faqs: [
      { q: "Kdo se může zaregistrovat?", a: "Firmy a OSVČ, které půjčují outdoor vybavení." },
      { q: "Co budu potřebovat?", a: "Základní údaje o půjčovně a kontaktní informace." },
      { q: "Musím mít web?", a: "Ne. Web je volitelný." },
      {
        q: "Co když už mám systém?",
        a: "Zaregistruj se a napiš nám, co používáš — domluvíme nejjednodušší postup.",
      },
    ],
    footerContact: "Kontakt: support@kitloop.cz.",
    footerPrivacy: "Ochrana soukromí",
  },
  en: {
    h1: "Inventory and reservations for rentals",
    sub: "A B2B app to manage gear, reservations, and issue/return for outdoor rental businesses.",
    cta1: "Register your rental",
    cta2: "Log in",
    micro: "We review each application personally to know our partners. Questions: support@kitloop.cz.",
    screenshotCaption: "Screenshot coming soon",
    isTitle: "Is",
    isntTitle: "Isn't",
    isBullets: [
      "for registered businesses and sole traders renting outdoor gear.",
      "for internal operations (inventory, reservations, issue, returns).",
    ],
    isntBullets: [
      "a public marketplace or a rental comparison site (for now).",
      "automatically open without provider approval.",
    ],
    productTitle: "What it looks like in practice",
    productLines: [
      "Manage your inventory and create reservations in one place.",
      "Track issue/return and print a handover protocol when needed.",
      "Data is separated between providers.",
    ],
    roadmapTitle: "What we're working on",
    roadmapIntro:
      "We build Kitloop step by step and openly — shaped with the first rental partners.",
    roadmapCards: [
      {
        label: "Today",
        text: "inventory, reservations, issue/return, print handover, CSV export.",
      },
      {
        label: "Now",
        text: "onboarding pilot rentals and collecting feedback.",
      },
      {
        label: "Direction",
        text: "if enough approved rentals join, we want to enable public gear discovery (no promised dates).",
      },
    ],
    howTitle: "How to start",
    steps: [
      "Create an account for your rental.",
      "Fill in your provider profile.",
      "Submit for manual approval.",
    ],
    howMicro: "Access to the app is enabled after manual provider approval.",
    faqTitle: "FAQ",
    faqs: [
      { q: "Who can register?", a: "Businesses and sole traders that rent outdoor gear." },
      { q: "What do I need?", a: "Basic rental details and contact information." },
      { q: "Do I need a website?", a: "No. A website is optional." },
      {
        q: "What if I already use a system?",
        a: "Register and tell us what you use — we'll suggest the simplest path.",
      },
    ],
    footerContact: "Contact: support@kitloop.cz.",
    footerPrivacy: "Privacy notice",
  },
} as const;

const CONTAINER = "max-w-6xl mx-auto px-4 sm:px-6";

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex gap-1">
      {(["cs", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            lang === l
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [lang, setLang] = useLang();
  const t = copy[lang];
  const privacyHref = `/privacy?lang=${lang}`;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Lang toggle — inline below Navbar, right-aligned */}
      <div className={`${CONTAINER} pt-4 flex justify-end`}>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className={`${CONTAINER} py-12 md:py-16`}>
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: copy + CTAs */}
          <div className="space-y-5">
            <h1 className="font-heading text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
              {t.h1}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">{t.sub}</p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button asChild size="lg" className="font-semibold">
                <Link to="/signup">{t.cta1}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">{t.cta2}</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t.micro}</p>
          </div>

          {/* Right: screenshot placeholder — order-last on mobile (CTAs first) */}
          <div className="order-last md:order-none">
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <div
                className="bg-muted relative"
                style={{ aspectRatio: "16/10" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
              </div>
              <CardContent className="py-2.5 px-4 border-t">
                <p className="text-xs text-muted-foreground text-center">{t.screenshotCaption}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Je / Není ────────────────────────────────────────── */}
      <section className={`${CONTAINER} py-12`}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.isTitle}
              </p>
              <ul className="space-y-2.5">
                {t.isBullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 text-green-600 shrink-0 font-bold">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.isntTitle}
              </p>
              <ul className="space-y-2.5">
                {t.isntBullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-0.5 shrink-0">✗</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* ── Product ──────────────────────────────────────────── */}
      <section className={`${CONTAINER} py-12`}>
        <h2 className="text-xl font-semibold mb-5">{t.productTitle}</h2>
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-5">
            <ul className="space-y-3">
              {t.productLines.map((line) => (
                <li key={line} className="flex gap-3 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ── Roadmap ──────────────────────────────────────────── */}
      <section className={`${CONTAINER} py-12`}>
        <h2 className="text-xl font-semibold mb-1">{t.roadmapTitle}</h2>
        <p className="text-sm text-muted-foreground mb-5">{t.roadmapIntro}</p>
        <div className="grid md:grid-cols-3 gap-4">
          {t.roadmapCards.map((card) => (
            <Card key={card.label} className="rounded-2xl border shadow-sm">
              <CardContent className="p-5 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p className="text-sm leading-relaxed">{card.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── How to start ─────────────────────────────────────── */}
      <section className={`${CONTAINER} py-12`}>
        <h2 className="text-xl font-semibold mb-5">{t.howTitle}</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {t.steps.map((step, i) => (
            <Card key={step} className="rounded-2xl border shadow-sm">
              <CardContent className="p-5 flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-0.5">{step}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-2">
          <Button asChild size="lg" className="font-semibold">
            <Link to="/signup">{t.cta1}</Link>
          </Button>
          <p className="text-sm text-muted-foreground">{t.howMicro}</p>
        </div>
      </section>

      <Separator />

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className={`${CONTAINER} py-12`}>
        <h2 className="text-xl font-semibold mb-5">{t.faqTitle}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {t.faqs.map((faq) => (
            <Card key={faq.q} className="rounded-2xl border shadow-sm">
              <CardContent className="p-5 space-y-1">
                <p className="font-semibold text-sm">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className={`${CONTAINER} py-8 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-sm text-muted-foreground`}>
        <span>{t.footerContact}</span>
        <Link
          to={privacyHref}
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {t.footerPrivacy}
        </Link>
      </div>

    </div>
  );
}
