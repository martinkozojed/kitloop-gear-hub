
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
    <section className="min-h-screen pt-24 pb-16 bg-background flex items-center relative overflow-hidden">
  <div className="absolute inset-0 z-0 opacity-20">
    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600"></div>
    <img 
      src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80" 
      alt={t('hero.image_alt')} 
      className="w-full h-full object-cover"
    />
  </div>

  <div className="container mx-auto relative z-10 flex flex-col items-center text-center max-w-4xl">
    <h1 className="text-4xl md:text-6xl font-bold mb-4 text-kitloop-text text-shadow">
      <span className="text-green-600">{t('hero.headline')}</span>
    </h1>
    <p className="text-lg md:text-xl text-kitloop-text mb-6 max-w-2xl">
      {t('hero.description')}
    </p>

    <div className="w-full max-w-2xl mb-6">
      <SearchBar />
    </div>

    <Button variant="ghost" asChild className="text-lg">
      <Link to="/add-rental">{t('hero.add_rental')}</Link>
    </Button>
  </div>
</section>

  );
};

export default Hero;
