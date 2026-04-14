/**
 * /onboarding — Kitloop pilot gateway
 *
 * State machine wrapper: holds pain selector state, lang sync,
 * and composes section components from /src/components/onboarding/.
 */
import { useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useProvider } from "@/context/ProviderContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import type { Lang, Pain } from "@/components/onboarding/shared";
import { firePainEvent } from "@/components/onboarding/shared";
import { OnboardingHero } from "@/components/onboarding/OnboardingHero";
import { PainSelector } from "@/components/onboarding/PainSelector";
import { IsIsntCards } from "@/components/onboarding/IsIsntCards";
import { OnboardingTimeline } from "@/components/onboarding/OnboardingTimeline";
import { PilotFeatures } from "@/components/onboarding/PilotFeatures";
import { TrustBlock } from "@/components/onboarding/TrustBlock";
import { OnboardingFAQ } from "@/components/onboarding/OnboardingFAQ";

import { FinalCTA } from "@/components/onboarding/FinalCTA";

// ─── URL param hook — pain only ─────────────────────────────────────────────

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

// ─── Main ───────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [pain, setPain] = usePain();
  const { isAuthenticated, isAdmin } = useAuth();
  const { isProvider } = useProvider();

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

  const handleScrollToFeatures = () =>
    featuresSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="light min-h-screen bg-background text-foreground">
      {/* Skip link */}
      <a
        href="#section-features"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:-translate-x-1/2 focus:z-[60] focus:bg-background focus:px-5 focus:py-2 focus:rounded-full focus:text-sm focus:font-semibold focus:ring-2 focus:ring-brand-600 focus:shadow-lg"
      >
        {t("onboarding.painSkip")}
      </a>

      {/* Header */}
      {!isAuthenticated && (
        <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border sticky top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
              <span className="text-brand-600 pr-0.5 tracking-tight">Kit</span>
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

      {/* Sections */}
      <OnboardingHero
        lang={lang}
        pain={pain}
        signupHref={signupHref}
        isProvider={isProvider}
        isAdmin={isAdmin}
        onScrollToFeatures={handleScrollToFeatures}
      />
      <PainSelector pain={pain} onPainClick={handlePainClick} />
      <IsIsntCards />
      <OnboardingTimeline featuresRef={featuresSectionRef} />
      <PilotFeatures />
      <TrustBlock />
      <OnboardingFAQ />
      <FinalCTA lang={lang} pain={pain} signupHref={signupHref} privacyHref={privacyHref} />
    </div>
  );
}
