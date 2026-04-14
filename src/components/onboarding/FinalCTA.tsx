import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { fireCtaEvent } from "./shared";
import type { Lang, Pain } from "./shared";

interface FinalCTAProps {
  lang: Lang;
  pain: Pain | null;
  signupHref: string;
  privacyHref: string;
}

export function FinalCTA({ lang, pain, signupHref, privacyHref }: FinalCTAProps) {
  const { t } = useTranslation();
  const { ref: revealRef, isVisible } = useScrollReveal();

  return (
    <>
      <section className="py-14 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <motion.div
            className="absolute -top-10 -left-10 w-[475px] h-[475px] rounded-full bg-brand-400/[0.15] blur-[100px]"
            animate={{ x: [0, 300, -50, 200, 0], y: [0, 150, -20, 100, 0], scale: [1, 1.2, 0.85, 1.1, 1] }}
            transition={{
              x: { duration: 37, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 43, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 47, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </div>
        <div ref={revealRef} className={`transition-all duration-slow ease-spring ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="relative mx-auto max-w-2xl rounded-2xl bg-white/60 border border-border backdrop-blur-md px-10 py-12 text-center space-y-5 shadow-xl">
          <h2 className="text-2xl font-bold md:text-3xl text-foreground">{t("onboarding.finalTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("onboarding.finalSub")}</p>
          <Button
            asChild variant="cta" size="cta"
            onClick={() => fireCtaEvent("final", lang, pain)}
          >
            <Link to={signupHref}>{t("onboarding.finalCta1")}</Link>
          </Button>
        </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-sm text-muted-foreground">
        <span>{t("onboarding.footerContact")}</span>
        <Link to={privacyHref} className="underline underline-offset-4 hover:text-foreground transition-colors">
          {t("onboarding.footerPrivacy")}
        </Link>
      </footer>
    </>
  );
}
