
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Search, Package } from "lucide-react";
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
    <h1 className="text-4xl md:text-6xl font-bold mb-6 text-kitloop-text text-shadow">
      <span className="text-green-600">{t('hero.headline')}</span>
    </h1>

    <div className="w-full max-w-2xl mb-8">
      <SearchBar />
    </div>

<div className="mt-4 text-sm text-muted-foreground">
  Are you a rental provider?{" "}
  <Link to="/add-rental" className="underline text-green-600 hover:text-green-600">
    Add your gear here.
  </Link>
</div>
</div>
</section>

  );
};

export default Hero;
