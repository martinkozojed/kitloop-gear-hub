
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Search, Calendar, CheckCircle, ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const StepCard = ({ step }: { step: Step }) => {
  const IconComponent = step.icon;
  
  return (
    <Card className="border-none shadow-md bg-white hover-lift">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mb-4`}>
          <IconComponent className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {step.title}
        </h3>
        <p className="text-muted-foreground">
          {step.description}
        </p>
      </CardContent>
    </Card>
  );
};

const HowItWorks = () => {
  const { t } = useTranslation();
  
  const steps: Step[] = [
    {
      id: 1,
      title: t('how_it_works.step_1_title'),
      description: t('how_it_works.step_1_description'),
      icon: Search,
      color: "bg-blue-100 text-blue-600"
    },
    {
      id: 2,
      title: t('how_it_works.step_2_title'),
      description: t('how_it_works.step_2_description'),
      icon: Calendar,
      color: "bg-purple-100 text-purple-600"
    },
    {
      id: 3,
      title: t('how_it_works.step_3_title'),
      description: t('how_it_works.step_3_description'),
      icon: CheckCircle,
      color: "bg-amber-100 text-amber-600"
    },
    {
      id: 4,
      title: t('how_it_works.step_4_title'),
      description: t('how_it_works.step_4_description'),
      icon: ArrowRight,
      color: "bg-green-100 text-green-600"
    }
  ];
  
  return (
    <section className="py-16 px-6 bg-kitloop-background">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">{t('how_it_works.title')}</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          {t('how_it_works.subtitle')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map(step => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
        
        <div className="text-center">
          <Button asChild className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-white">
            <Link to="/how-it-works">{t('how_it_works.learn_more')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
