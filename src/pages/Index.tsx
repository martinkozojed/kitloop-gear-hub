
import React from 'react';
import Hero from '../components/home/Hero';
import CategorySection from '../components/home/CategorySection';
import HowItWorks from '../components/home/HowItWorks';
import FeaturedGear from '../components/home/FeaturedGear';
import MapSection from '../components/home/MapSection';
import FAQ from '../components/home/FAQ';
import CallToAction from '../components/home/CallToAction';

const Index = () => {
  return (
    <div className="bg-kitloop-background">
      <Hero />
      <CategorySection />
      <HowItWorks />
      <FeaturedGear />
      <MapSection />
      <FAQ />
      <CallToAction />
    </div>
  );
};

export default Index;
