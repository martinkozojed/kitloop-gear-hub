import enCommon from "./en.json";
import enHowItWorks from "./en/howitworks.json";
import csCommon from "./cs.json";
import csHowItWorks from "./cs/howitworks.json";

export const enTranslations = {
  ...enCommon,
  howItWorks: enHowItWorks,
} as const;

export const csTranslations = {
  ...csCommon,
  howItWorks: csHowItWorks,
} as const;

export type TranslationSchema = typeof enTranslations;
