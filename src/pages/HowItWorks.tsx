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

<<<<<<< HEAD
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-24">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-md border border-[#E5E7EB] flex flex-col gap-4 items-start"
          >
            <div className="bg-kitloop-accent rounded-md p-3 shadow-md">
              {step.icon}
=======
      {/* Process Steps */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center animate-fade-in" style={{animationDelay: "0.1s"}}>
              <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6 hover-lift">
                <Search className="w-12 h-12 text-secondary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Choose your gear</h3>
              <p className="text-muted-foreground">
                Search by location or activity and find exactly what you need for your next adventure.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center animate-fade-in" style={{animationDelay: "0.2s"}}>
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-6 hover-lift">
                <CalendarCheck className="w-12 h-12 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Reserve online</h3>
              <p className="text-muted-foreground">
                Select your dates and pay securely online. No phone calls or paperwork needed.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center animate-fade-in" style={{animationDelay: "0.3s"}}>
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 hover-lift">
                <MapPin className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Pick it up</h3>
              <p className="text-muted-foreground">
                Get your gear from a local shop or a trusted individual at the agreed location.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center animate-fade-in" style={{animationDelay: "0.4s"}}>
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 hover-lift">
                <Star className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Return & rate</h3>
              <p className="text-muted-foreground">
                Return the gear as agreed and leave a review to help the community.
              </p>
>>>>>>> f4f383cb8b7a9d5945e38e92e4ddd75f7abbeb4a
            </div>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>

<<<<<<< HEAD
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
=======
      {/* Visual Timeline */}
      <section className="py-16 px-6 bg-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Your Rental Journey</h2>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-kitloop-accent/30"></div>
            
            {/* Timeline Items */}
            <div className="space-y-16 md:space-y-24">
              {/* Item 1 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 md:text-right animate-fade-in">
                  <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">Find the perfect gear</h3>
                  <p className="text-muted-foreground">
                    Browse through thousands of rental options filtered by location, activity, or specific equipment type. See what's available nearby with real-time availability.
                  </p>
                </div>
                <div className="relative md:w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <div className="md:w-1/2 md:pl-16 md:text-left hidden md:block">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <Search className="w-16 h-16 text-kitloop-accent mb-4" />
                  </div>
                </div>
              </div>
              
              {/* Item 2 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 text-left md:text-right hidden md:block">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <CalendarCheck className="w-16 h-16 text-kitloop-accent mb-4" />
                  </div>
                </div>
                <div className="relative md:w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <div className="md:w-1/2 md:pl-16 md:text-left animate-fade-in">
                  <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">Book in seconds</h3>
                  <p className="text-muted-foreground">
                    Select your rental dates, add any necessary extras, and complete your booking with our secure payment system. Receive instant confirmation.
                  </p>
                </div>
              </div>
              
              {/* Item 3 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 md:text-right animate-fade-in">
                  <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">Easy pickup</h3>
                  <p className="text-muted-foreground">
                    Get directions to your pickup location after booking confirmation. Meet with the provider and receive your gear with a quick ID check.
                  </p>
                </div>
                <div className="relative md:w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <div className="md:w-1/2 md:pl-16 md:text-left hidden md:block">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <MapPin className="w-16 h-16 text-kitloop-accent mb-4" />
                  </div>
                </div>
              </div>
              
              {/* Item 4 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 text-left md:text-right hidden md:block">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <Star className="w-16 h-16 text-kitloop-accent mb-4" />
                  </div>
                </div>
                <div className="relative md:w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                  <span className="text-white font-bold text-xl">4</span>
                </div>
                <div className="md:w-1/2 md:pl-16 md:text-left animate-fade-in">
                  <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">Return & review</h3>
                  <p className="text-muted-foreground">
                    Return your gear to the same location (unless specified otherwise). Share your experience with the community by leaving a helpful review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-kitloop-accent/20 to-background">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold mb-8">Why Rent with Kitloop?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-background p-6 rounded-lg shadow-sm hover-lift">
              <h3 className="text-xl font-semibold mb-3">Save Money</h3>
              <p className="text-muted-foreground">
                Why buy expensive gear you'll only use a few times a year? Rent exactly what you need, when you need it.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg shadow-sm hover-lift">
              <h3 className="text-xl font-semibold mb-3">Try Before You Buy</h3>
              <p className="text-muted-foreground">
                Test out different models and brands before committing to a purchase. Find what works best for you.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg shadow-sm hover-lift">
              <h3 className="text-xl font-semibold mb-3">Travel Light</h3>
              <p className="text-muted-foreground">
                Pick up gear at your destination instead of carrying it with you. Perfect for traveling adventurers.
              </p>
>>>>>>> f4f383cb8b7a9d5945e38e92e4ddd75f7abbeb4a
            </div>
            <p className="text-sm text-muted-foreground italic">"{testimonial.quote}"</p>
          </div>
        ))}
      </div>
    </section>
  );
}
