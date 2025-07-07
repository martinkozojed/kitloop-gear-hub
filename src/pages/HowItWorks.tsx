
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Search, 
  CalendarCheck, 
  MapPin, 
  Star 
} from "lucide-react";

const HowItWorks = () => {
  return (
    <div className="bg-kitloop-background min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How Kitloop Works</h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-muted-foreground">
            Rent outdoor gear easily in four simple steps
          </p>
        </div>
      </section>

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
            </div>
          </div>
        </div>
      </section>

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
                <div className="flex flex-col md:flex-row items-start">
                  <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 flex md:justify-end animate-fade-in">
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                        <span className="text-white font-bold text-xl">1</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-kitloop-accent">Find the perfect gear</h3>
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-16 animate-fade-in">
                    <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                      <Search className="w-16 h-16 text-kitloop-accent mb-4" />
                      <p className="text-muted-foreground">
                        Browse through thousands of rental options filtered by location, activity, or specific equipment type. See what's available nearby with real-time availability.
                      </p>
                    </div>
                  </div>
                </div>
              
              {/* Item 2 */}
              <div className="flex flex-col md:flex-row-reverse items-start">
                <div className="md:w-1/2 md:pl-16 mb-6 md:mb-0 flex md:justify-start animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                      <span className="text-white font-bold text-xl">2</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-kitloop-accent">Book in seconds</h3>
                  </div>
                </div>
                <div className="md:w-1/2 md:pr-16 animate-fade-in">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <CalendarCheck className="w-16 h-16 text-kitloop-accent mb-4" />
                    <p className="text-muted-foreground">
                      Select your rental dates, add any necessary extras, and complete your booking with our secure payment system. Receive instant confirmation.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Item 3 */}
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 flex md:justify-end animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                      <span className="text-white font-bold text-xl">3</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-kitloop-accent">Easy pickup</h3>
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-16 animate-fade-in">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <MapPin className="w-16 h-16 text-kitloop-accent mb-4" />
                    <p className="text-muted-foreground">
                      Get directions to your pickup location after booking confirmation. Meet with the provider and receive your gear with a quick ID check.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Item 4 */}
              <div className="flex flex-col md:flex-row-reverse items-start">
                <div className="md:w-1/2 md:pl-16 mb-6 md:mb-0 flex md:justify-start animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full bg-kitloop-accent flex items-center justify-center z-10">
                      <span className="text-white font-bold text-xl">4</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-kitloop-accent">Return & review</h3>
                  </div>
                </div>
                <div className="md:w-1/2 md:pr-16 animate-fade-in">
                  <div className="bg-kitloop-light-gray rounded-lg p-8 shadow-sm hover-lift">
                    <Star className="w-16 h-16 text-kitloop-accent mb-4" />
                    <p className="text-muted-foreground">
                      Return your gear to the same location (unless specified otherwise). Share your experience with the community by leaving a helpful review.
                    </p>
                  </div>
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
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-white px-8 py-6 text-lg hover-lift">
              Start Browsing Gear
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
