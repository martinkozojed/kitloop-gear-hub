
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => changeLanguage('en')} 
        className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${i18n.language === 'en' ? 'bg-kitloop-accent/20' : 'hover:bg-gray-100'}`}
        aria-label={t('language_selector.en')}
      >
        <span className="text-base">🇺🇸</span>
        <span className="text-xs hidden sm:inline">{t('language_selector.en')}</span>
      </button>
      <button 
        onClick={() => changeLanguage('cs')} 
        className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${i18n.language === 'cs' ? 'bg-kitloop-accent/20' : 'hover:bg-gray-100'}`}
        aria-label={t('language_selector.cs')}
      >
        <span className="text-base">🇨🇿</span>
        <span className="text-xs hidden sm:inline">{t('language_selector.cs')}</span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
