import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const HeroSectionB = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [gear, setGear] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (gear) params.append('query', gear);
    if (location) params.append('location', location);
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <section className="bg-primary text-foreground py-16 sm:py-24">
      <div className="container mx-auto max-w-6xl px-4 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground">
            {t('hero.subtitle')}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center bg-background rounded-xl shadow-lg p-4 gap-2 w-full lg:w-auto">
          <Input
            value={gear}
            onChange={(e) => setGear(e.target.value)}
            placeholder={t('hero.gearPlaceholder')}
            className="flex-grow bg-transparent py-4 px-3 text-foreground"
          />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('hero.locationPlaceholder')}
            className="flex-grow bg-transparent py-4 px-3 text-foreground"
          />
          <Button type="submit" className="shrink-0 w-full sm:w-auto py-4 px-6 text-lg">
            {t('hero.cta')}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default HeroSectionB;
