import React from "react";
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "cs" ? "en" : "cs";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="text-sm font-medium text-kitloop-text hover:text-green-600 transition-colors"
    >
      {currentLang === "cs" ? "🇨🇿 CZ" : "🇺🇸 EN"}
    </button>
  );
};

export default LanguageSwitcher;
