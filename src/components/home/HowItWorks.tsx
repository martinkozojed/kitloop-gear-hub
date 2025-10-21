
import React from 'react';
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

const StepItem = ({ step }: { step: Step }) => {
  const IconComponent = step.icon;
  return (
    <li className="relative pl-10 pb-10 last:pb-0">
      <span
        className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full ${step.color}`}
      >
        <IconComponent className="w-3 h-3" />
      </span>
      <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
      <h3 className="font-semibold text-lg">{step.title}</h3>
      <p className="text-muted-foreground text-sm">{step.description}</p>
    </li>
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
      color: "bg-secondary/20 text-secondary"
    },
    {
      id: 2,
      title: t('how_it_works.step_2_title'),
      description: t('how_it_works.step_2_description'),
      icon: Calendar,
      color: "bg-accent/20 text-accent"
    },
    {
      id: 3,
      title: t('how_it_works.step_3_title'),
      description: t('how_it_works.step_3_description'),
      icon: CheckCircle,
      color: "bg-gradient-to-br from-green-400 to-green-600 text-white"
    },
    {
      id: 4,
      title: t('how_it_works.step_4_title'),
      description: t('how_it_works.step_4_description'),
      icon: ArrowRight,
      color: "bg-gradient-to-br from-green-400 to-green-600 text-white"
    }
  ];
  
  return (
    <section id="how-it-works" className="py-16 px-6 bg-kitloop-background">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">{t('how_it_works.title')}</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          {t('how_it_works.subtitle')}
        </p>
        
        <ol className="relative border-l border-gray-300 max-w-xl mx-auto mb-12">
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </ol>
        
        <div className="text-center">
          <Button asChild variant="primary">
            <Link to="/how-it-works">{t('how_it_works.learn_more')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
