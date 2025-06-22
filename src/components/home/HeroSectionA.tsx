import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const HeroSectionA = () => {
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
      <div className="container mx-auto max-w-2xl px-4 text-center space-y-8">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            {t('hero.subtitle')}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={gear}
            onChange={(e) => setGear(e.target.value)}
            placeholder={t('hero.gearPlaceholder')}
            className="bg-white py-6 text-foreground"
          />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('hero.locationPlaceholder')}
            className="bg-white py-6 text-foreground"
          />
          <Button type="submit" className="w-full py-6 text-lg">
            {t('hero.cta')}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default HeroSectionA;
