
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Hero from '../components/home/Hero';
import CategorySection from '../components/home/CategorySection';
import HowItWorks from '../components/home/HowItWorks';
import FeaturedGear from '../components/home/FeaturedGear';
import MapSection from '../components/home/MapSection';
import FAQ from '../components/home/FAQ';

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    // Check if we need to scroll to a section after navigation
    if (location.state && location.state.scrollTo) {
      const sectionId = location.state.scrollTo;
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  return (
    <div className="bg-kitloop-background">
      <Hero />
      <CategorySection />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <FeaturedGear />
      <MapSection />
      <div id="faq">
        <FAQ />
      </div>
    </div>
  );
};

export default Index;
