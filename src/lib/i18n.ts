
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { csTranslations, enTranslations } from "../locales/resources";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      cs: { translation: csTranslations }
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: {
      // This ensures compatibility with React's type system
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    }
  });

export default i18n;
