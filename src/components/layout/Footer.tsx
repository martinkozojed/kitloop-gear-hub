import React from 'react';
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Footer = () => {
  const { t } = useTranslation();

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t bg-muted py-12 px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          
          {/* About */}
          <div>
            <h3 className="font-bold text-xl mb-4">
              <span className="text-green-600">Kit</span>loop
            </h3>
            <p className="text-muted-foreground mb-4">
              Making outdoor gear rental fast, simple, and seamless. Access over ownership.
            </p>
          </div>

          {/* Discover */}
          <div>
            <h3 className="font-bold mb-4">Discover</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/browse" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.browse')}
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.how_it_works')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:info@kitloop.app" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.contact')}
                </a>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('faq')}
                  className="text-muted-foreground hover:text-green-600 transition-colors text-left"
                >
                  {t('footer.faq')}
                </button>
              </li>
              <li>
                <Link to="/add-rental" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('hero.add_rental')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-green-600 transition-colors">
                  {t('footer.cookies')}
                </Link>
              </li>
            </ul>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm mb-4 md:mb-0">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex space-x-6">
            {/* Social icons beze změny, pokud nejsou potřeba */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
