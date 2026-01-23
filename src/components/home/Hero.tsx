
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from './SearchBar';
import { useTranslation } from "react-i18next";

const Hero = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleFindGear = () => {
    navigate('/browse');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <img
        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80"
        alt={t('hero.image_alt')}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/60 sm:bg-primary/40" />

      <div className="container relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4">
          {t('hero.headline')}
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-6">
          {t('hero.description')}
        </p>

        <div className="w-full max-w-2xl mb-6">
          <SearchBar />
        </div>

        <Button variant="ghost" asChild className="text-lg text-white">
          <Link to="/add-rental">{t('hero.add_rental')}</Link>
        </Button>
      </div>
    </section>

  );
};

export default Hero;
