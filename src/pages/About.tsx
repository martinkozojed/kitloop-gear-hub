
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-kitloop-background min-h-screen pt-12 pb-16">
      {/* Section 1: Why Kitloop Was Created */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-10 text-center">{t('about.title')}</h1>
          
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-green-600">{t('about.why_kitloop.title')}</h2>
            <div className="space-y-4 text-lg">
              <p>
                {t('about.why_kitloop.paragraph1')}
              </p>
              <p>
                {t('about.why_kitloop.paragraph2')}
              </p>
              <p>
                {t('about.why_kitloop.paragraph3')}
              </p>
            </div>
          </div>
          
          {/* Section 2: About the Founder */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8 text-green-600">{t('about.founder.title')}</h2>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/2 space-y-4 text-lg">
                <p>
                  {t('about.founder.paragraph1')}
                </p>
                <p>
                  {t('about.founder.paragraph2')}
                </p>
                <p>
                  {t('about.founder.paragraph3')}
                </p>
              </div>
              <div className="md:w-1/2 flex justify-center">
                <img 
                  src="/lovable-uploads/b1f0a36d-5b99-458c-bae3-638430580400.png" 
                  alt={t('about.founder.image_alt')} 
                  className="rounded-lg max-w-full shadow-md object-cover max-h-80"
                />
              </div>
            </div>
          </div>
          
          {/* Optional CTA */}
          <div className="text-center mt-16">
            <Button asChild className="bg-green-600 hover:bg-green-600 text-white px-8 py-6 text-lg">
              <Link to="/add-rental">{t('about.cta')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
