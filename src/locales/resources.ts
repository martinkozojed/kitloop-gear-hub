import enCommon from "./en.json";
import enHowItWorks from "./en/howitworks.json";
import enOnboarding from "./en/onboarding.json";
import csCommon from "./cs.json";
import csHowItWorks from "./cs/howitworks.json";
import csOnboarding from "./cs/onboarding.json";

// Merge landing-page onboarding translations with dashboard onboarding keys
// (wizard + checklist) from the main locale files. The spread order ensures
// landing-page keys (en/onboarding.json) take precedence for shared keys.
export const enTranslations = {
  ...enCommon,
  howItWorks: enHowItWorks,
  onboarding: {
    ...(enCommon as Record<string, unknown>).onboarding as object,
    ...enOnboarding,
  },
} as const;

export const csTranslations = {
  ...csCommon,
  howItWorks: csHowItWorks,
  onboarding: {
    ...(csCommon as Record<string, unknown>).onboarding as object,
    ...csOnboarding,
  },
} as const;

export type TranslationSchema = typeof enTranslations;
