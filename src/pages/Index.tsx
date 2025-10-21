import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/home/Hero';
import FeaturedGear from '../components/home/FeaturedGear';
import CategorySection from '../components/home/CategorySection';
import MapSection from '../components/home/MapSection';
import FAQ from '../components/home/FAQ';

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    const hashTarget = location.hash ? location.hash.replace('#', '') : '';
    const sectionId = state?.scrollTo ?? hashTarget;
    if (!sectionId) return;

    // Delay ensures the DOM is ready when navigating from another page
    const timer = window.setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [location]);

  return (
    <>
      <Hero />
      <FeaturedGear />
      <CategorySection />
      <MapSection />
      <FAQ />
    </>
  );
};

export default Index;
