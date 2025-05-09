
import React from 'react';
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-16 px-6 bg-gradient-to-br from-kitloop-accent/20 to-white">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready for your next adventure?</h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of outdoor enthusiasts who are already using Kitloop to access gear without the hassle of ownership.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-kitloop-text px-8 py-6 text-lg hover-lift">
            Find Gear Now
          </Button>
          <Button variant="outline" className="border-kitloop-accent text-kitloop-text px-8 py-6 text-lg hover-lift">
            Become a Provider
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
