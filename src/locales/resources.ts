import enCommon from "./en.json";
import enHowItWorks from "./en/howitworks.json";
import enOnboarding from "./en/onboarding.json";
import csCommon from "./cs.json";
import csHowItWorks from "./cs/howitworks.json";
import csOnboarding from "./cs/onboarding.json";

function getOnboardingFromCommon(common: Record<string, unknown>): Record<string, unknown> {
  const o = common.onboarding;
  return (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
}

// Merge landing-page onboarding (en/onboarding.json) with dashboard onboarding
// (wizard + checklist from en.json/cs.json). Landing-page keys take precedence.
export const enTranslations = {
  ...enCommon,
  howItWorks: enHowItWorks,
  onboarding: {
    ...getOnboardingFromCommon(enCommon as Record<string, unknown>),
    ...enOnboarding,
  },
} as const;

export const csTranslations = {
  ...csCommon,
  howItWorks: csHowItWorks,
  onboarding: {
    ...getOnboardingFromCommon(csCommon as Record<string, unknown>),
    ...csOnboarding,
  },
} as const;

export type TranslationSchema = typeof enTranslations;
