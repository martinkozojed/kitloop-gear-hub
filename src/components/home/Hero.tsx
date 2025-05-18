
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
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-kitloop-background to-white py-20 px-6">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-kitloop-accent/20 to-transparent"></div>
        <img 
          src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80" 
          alt={t('hero.image_alt')} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto relative z-10 flex flex-col items-center text-center max-w-4xl animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-kitloop-text text-shadow">
          <span className="text-kitloop-accent">{t('hero.headline')}</span>
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-2xl">
          {t('hero.description')}
        </p>
        
        <div className="w-full max-w-2xl mb-8">
          <SearchBar />
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-kitloop-text px-6 py-6 text-lg hover-lift"
            onClick={handleFindGear}
          >
            <Search className="mr-2 h-5 w-5" /> {t('hero.cta')}
          </Button>
          <Link to="/add-rental">
            <Button variant="outline" className="bg-white/80 hover:bg-white text-kitloop-text border-kitloop-accent px-6 py-6 text-lg hover-lift">
              <Package className="mr-2 h-5 w-5" /> {t('hero.add_rental')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
