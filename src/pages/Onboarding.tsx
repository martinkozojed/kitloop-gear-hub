import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
    providerSetupLabel: "Přejít do nastavení půjčovny",
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
    providerSetupLabel: "Go to provider setup",
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

export default function Onboarding() {
  const [lang, setLang] = useLang();
  const t = copy[lang];
  const privacyHref = `/privacy?lang=${lang}`;
  const { isAuthenticated, isProvider } = useAuth();
  const providerSetupHref = `/provider/setup?lang=${lang}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Lang toggle */}
      <div className="fixed top-4 right-4 z-50 flex gap-1">
        <button
          onClick={() => setLang("cs")}
          className={`px-3 py-1 text-sm rounded-token-sm border transition-colors ${
            lang === "cs"
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          }`}
        >
          CZ
        </button>
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1 text-sm rounded-token-sm border transition-colors ${
            lang === "en"
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          }`}
        >
          EN
        </button>
      </div>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
        <div className="space-y-6">
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            {t.h1}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{t.sub}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="font-semibold">
              <Link to="/signup">{t.cta1}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">{t.cta2}</Link>
            </Button>
          </div>
          {isAuthenticated && isProvider && (
            <div className="pt-2">
              <Button asChild variant="secondary" size="sm">
                <Link to={providerSetupHref}>{t.providerSetupLabel}</Link>
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{t.micro}</p>
        </div>
      </section>

      <Separator />

      {/* Is / Isn't */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-6 space-y-3">
              <p className="font-semibold text-base">{t.isTitle}</p>
              <ul className="space-y-2">
                {t.isBullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-foreground">
                    <span className="mt-0.5 text-green-600 shrink-0">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-6 space-y-3">
              <p className="font-semibold text-base">{t.isntTitle}</p>
              <ul className="space-y-2">
                {t.isntBullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-muted-foreground">
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

      {/* Product section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-heading text-2xl font-bold mb-8">{t.productTitle}</h2>
        <ul className="space-y-4">
          {t.productLines.map((line) => (
            <li key={line} className="flex gap-3 text-base">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      {/* Roadmap */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-heading text-2xl font-bold mb-3">{t.roadmapTitle}</h2>
        <p className="text-muted-foreground mb-8 text-sm">{t.roadmapIntro}</p>
        <div className="grid md:grid-cols-3 gap-5">
          {t.roadmapCards.map((card) => (
            <Card key={card.label} className="rounded-2xl border shadow-sm">
              <CardContent className="p-5 space-y-2">
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

      {/* How to start */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-heading text-2xl font-bold mb-8">{t.howTitle}</h2>
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {t.steps.map((step, i) => (
            <Card key={step} className="rounded-2xl border shadow-sm">
              <CardContent className="p-5 flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-1">{step}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          <Button asChild size="lg" className="font-semibold">
            <Link to="/signup">{t.cta1}</Link>
          </Button>
          <p className="text-sm text-muted-foreground">{t.howMicro}</p>
        </div>
      </section>

      <Separator />

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-heading text-2xl font-bold mb-8">{t.faqTitle}</h2>
        <div className="grid md:grid-cols-2 gap-5">
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

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-sm text-muted-foreground">
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
