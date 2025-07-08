import React from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname !== '/') {
      // Redirect to homepage with section hash
      window.location.href = `/#${sectionId}`;
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="py-4 px-6 md:px-10 bg-white text-green-600 fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link to="/" className="text-2xl font-bold flex items-center">
            <span className="text-green-600 pr-0.5 tracking-tight">Kit</span>
            <span className="text-text tracking-wide">loop</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 hidden md:flex justify-center items-center gap-8 text-text">
          <Link to="/how-it-works" className="hover:underline transition-colors duration-200">
            {t('navbar.how_it_works')}
          </Link>
          <Link to="/browse" className="hover:underline transition-colors duration-200">
            {t('navbar.browse_gear')}
          </Link>
          <Link to="/about" className="hover:underline transition-colors duration-200">
            {t('navbar.about_us')}
          </Link>
          <button
            onClick={() => scrollToSection('faq')}
            className="hover:underline transition-colors duration-200"
          >
            {t('navbar.faq')}
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="outline" className="hidden md:flex" asChild>
            <Link to="/login">{t('navbar.sign_in')}</Link>
          </Button>
          <Button variant="primary" asChild>
            <Link to="/signup">{t('navbar.sign_up')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
