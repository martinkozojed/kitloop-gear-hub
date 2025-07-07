import React from "react";
import { Search, Calendar, MapPin, Box, User } from "lucide-react";

const steps = [
  {
    title: "Find gear",
    description:
      "Search by location, activity or gear type. See what’s available near you – fast and clearly.",
    icon: <Search className="h-6 w-6 text-white" />,
  },
  {
    title: "Book online",
    description:
      "Choose pickup location, rental dates, and gear. Pay securely online and get instant confirmation.",
    icon: <Calendar className="h-6 w-6 text-white" />,
  },
  {
    title: "Pickup & go",
    description:
      "Show your code at pickup, get your gear. Simple handoff, quick check – you're ready.",
    icon: <MapPin className="h-6 w-6 text-white" />,
  },
  {
    title: "Return & confirm",
    description:
      "Bring the gear back, provider checks it, and confirms return. Everything tracked in the app.",
    icon: <Box className="h-6 w-6 text-white" />,
  },
];

const testimonials = [
  {
    name: "Petr, Zlín",
    quote:
      "Everything was ready when I arrived. Smooth pickup, great gear quality, and quick return process.",
  },
  {
    name: "Verča, Prague",
    quote:
      "Super easy booking and pickup. Loved how clear everything was. Will definitely use Kitloop again!",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
        <p className="text-muted-foreground">
          Just 4 steps to get out there. Fast, simple, done.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-24">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-md border border-[#E5E7EB] flex flex-col gap-4 items-start"
          >
            <div className="bg-kitloop-accent rounded-md p-3 shadow-md">
              {step.icon}
            </div>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto text-center mb-12">
        <h3 className="text-2xl font-bold mb-4">What users say</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-md border border-[#E5E7EB] flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-kitloop-accent">
              <User className="h-5 w-5" />
              <span className="font-semibold">{testimonial.name}</span>
            </div>
            <p className="text-sm text-muted-foreground italic">"{testimonial.quote}"</p>
          </div>
        ))}
      </div>
    </section>
  );
}
