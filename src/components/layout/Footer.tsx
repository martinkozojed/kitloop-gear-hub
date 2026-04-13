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
    <footer className="bg-[hsl(174,8%,11%)] py-12 px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* About */}
          <div>
            <h3 className="font-heading font-bold text-xl mb-4">
              <span className="text-brand-400">Kit</span><span className="text-white">loop</span>
            </h3>
            <p className="text-[hsl(174,3%,62%)] mb-4">
              Kitloop je systém pro provoz půjčoven outdoor vybavení: rezervace, inventář, výdej a vratka.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-widest mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('product')}
                  className="text-[hsl(174,3%,62%)] hover:text-brand-400 transition-colors duration-fast text-left"
                >
                  {t('navbar.product')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('faq')}
                  className="text-[hsl(174,3%,62%)] hover:text-brand-400 transition-colors duration-fast text-left"
                >
                  {t('footer.faq')}
                </button>
              </li>
              <li>
                <Link to="/" className="text-[hsl(174,3%,62%)] hover:text-brand-400 transition-colors duration-fast">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-widest mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-[hsl(174,3%,62%)] hover:text-brand-400 transition-colors duration-fast">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-widest mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-[hsl(174,3%,62%)] hover:text-brand-400 transition-colors duration-fast">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[hsl(174,3%,62%)] hover:text-brand-400 transition-colors duration-fast">
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 mt-8 border-t border-[hsl(174,5%,22%)] flex flex-col md:flex-row justify-between items-center">
          <p className="text-[hsl(174,3%,46%)] text-sm mb-4 md:mb-0">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex space-x-6">
            {/* Social icons */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
