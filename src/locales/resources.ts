import enCommon from "./en.json";
import enHowItWorks from "./en/howitworks.json";
import enOnboarding from "./en/onboarding.json";
import csCommon from "./cs.json";
import csHowItWorks from "./cs/howitworks.json";
import csOnboarding from "./cs/onboarding.json";

export const enTranslations = {
  ...enCommon,
  howItWorks: enHowItWorks,
  onboarding: enOnboarding,
} as const;

export const csTranslations = {
  ...csCommon,
  howItWorks: csHowItWorks,
  onboarding: csOnboarding,
} as const;

export type TranslationSchema = typeof enTranslations;
