import React from "react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("cs") ? "cs" : "en";

  const toggleLanguage = () => {
    const newLang = currentLang === "cs" ? "en" : "cs";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 rounded px-0.5"
    >
      {currentLang === "en" ? "CS" : "EN"}
    </button>
  );
};

export default LanguageSwitcher;
