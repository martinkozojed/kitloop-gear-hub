import { useSearchParams, useNavigate, Link } from "react-router-dom";
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
    title: "Ochrana soukromí",
    blocks: [
      {
        heading: "Co shromažďujeme",
        text: "Údaje, které zadáš při registraci a při používání aplikace: profil poskytovatele, rezervace, inventář.",
      },
      {
        heading: "Účel zpracování",
        text: "Provoz služby, zákaznická podpora, bezpečnost a prevence zneužití.",
      },
      {
        heading: "Kontakt",
        text: "support@kitloop.cz",
      },
    ],
    mvpNote: "Jde o minimální MVP informaci; detaily můžeme doplnit později.",
    backLink: "← Zpět na onboarding",
  },
  en: {
    title: "Privacy notice",
    blocks: [
      {
        heading: "What we collect",
        text: "Data you submit in registration and when using the app: provider profile, reservations, inventory.",
      },
      {
        heading: "Purpose",
        text: "Operating the service, support, security and abuse prevention.",
      },
      {
        heading: "Contact",
        text: "support@kitloop.cz",
      },
    ],
    mvpNote: "This is a minimal MVP notice; details may be expanded later.",
    backLink: "← Back to onboarding",
  },
} as const;

export default function Privacy() {
  const [lang, setLang] = useLang();
  const t = copy[lang];
  const onboardingHref = `/onboarding?lang=${lang}`;

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

      <div className="max-w-2xl mx-auto px-6 py-20">
        <Link
          to={onboardingHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          {t.backLink}
        </Link>

        <h1 className="font-heading text-3xl font-bold mb-10">{t.title}</h1>

        <div className="space-y-8">
          {t.blocks.map((block, i) => (
            <div key={block.heading}>
              <h2 className="font-semibold text-base mb-2">{block.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>
              {i < t.blocks.length - 1 && <Separator className="mt-8" />}
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground italic">{t.mvpNote}</p>
      </div>
    </div>
  );
}
