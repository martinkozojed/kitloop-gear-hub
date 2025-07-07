import React from "react";
import {
  Search,
  CalendarCheck,
  MapPin,
  Star,
  User,
} from "lucide-react";

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
    <section className="py-16 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Your Rental Journey
        </h2>

        <div className="relative">
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-kitloop-accent/30"></div>

          <div className="space-y-16 md:space-y-24">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 md:text-right animate-fade-in">
                <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">
                  Find the perfect gear
                </h3>
                <p className="text-muted-foreground">
                  Browse through thousands of rental options filtered by
                  location, activity, or specific equipment type. See what's
                  available nearby with real-time availability.
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

            {/* Step 2 */}
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
                <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">
                  Book in seconds
                </h3>
                <p className="text-muted-foreground">
                  Select your rental dates, add any necessary extras, and
                  complete your booking with our secure payment system. Receive
                  instant confirmation.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-16 mb-6 md:mb-0 md:text-right animate-fade-in">
                <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">
                  Easy pickup
                </h3>
                <p className="text-muted-foreground">
                  Get directions to your pickup location after booking
                  confirmation. Meet with the provider and receive your gear
                  with a quick ID check.
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

            {/* Step 4 */}
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
                <h3 className="text-2xl font-semibold mb-2 text-kitloop-accent">
                  Return & review
                </h3>
                <p className="text-muted-foreground">
                  Return your gear to the same location (unless specified
                  otherwise). Share your experience with the community by
                  leaving a helpful review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Testimonials */}
      <div className="max-w-3xl mx-auto text-center mt-24 mb-12">
        <h3 className="text-2xl font-bold mb-4">What users say</h3>
      </div>
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
>>>>>>> 07a28213b7dec1d529de8487aac3ec79974a4e5f

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
            <p className="text-sm text-muted-foreground italic">
              "{testimonial.quote}"
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
