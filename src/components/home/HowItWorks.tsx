
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Choose",
    description: "Browse through our selection of gear from verified rental providers.",
    icon: Search,
    color: "bg-blue-100 text-blue-600"
  },
  {
    id: 2,
    title: "Reserve",
    description: "Select your dates and pay securely online. No more phone calls needed.",
    icon: Calendar,
    color: "bg-purple-100 text-purple-600"
  },
  {
    id: 3,
    title: "Pick up",
    description: "Get your gear from the rental shop or have it delivered to you.",
    icon: CheckCircle,
    color: "bg-amber-100 text-amber-600"
  },
  {
    id: 4,
    title: "Return",
    description: "Return the gear at the agreed time. No hassle, no surprises.",
    icon: ArrowRight,
    color: "bg-green-100 text-green-600"
  }
];

const StepCard = ({ step }: { step: typeof steps[0] }) => {
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
  return (
    <section className="py-16 px-6 bg-kitloop-background">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">How Kitloop Works</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          Renting outdoor gear has never been easier
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(step => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
