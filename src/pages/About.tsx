
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="bg-kitloop-background min-h-screen pt-12 pb-16">
      {/* Section 1: Why Kitloop Was Created */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-10 text-center">About Us</h1>
          
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-kitloop-accent">Why Kitloop Was Created</h2>
            <div className="space-y-4 text-lg">
              <p>
                Kitloop started as a fictional business for a university marketing course.
                But instead of creating something random, I looked at a real problem: at home, we had tons of outdoor gear that we used only once or twice a year. Meanwhile, people kept buying new things.
              </p>
              <p>
                That's how the idea was born — a platform where rental providers and individuals could offer their gear online, all in one place.
              </p>
              <p>
                We believe the gear rental market urgently needs digitalization — and this is our answer.
              </p>
            </div>
          </div>
          
          {/* Section 2: About the Founder */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8 text-kitloop-accent">About the Founder</h2>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/2 space-y-4 text-lg">
                <p>
                  Hi! I'm Martin Kozojed – a student of tourism, outdoor enthusiast, and technology lover.
                </p>
                <p>
                  I created Kitloop because I wanted to combine all the things I care about: nature, community, and smart digital solutions.
                </p>
                <p>
                  I believe gear should be accessible, not owned. Kitloop is my way of making that happen.
                </p>
              </div>
              <div className="md:w-1/2 flex justify-center">
                <img 
                  src="/lovable-uploads/b1f0a36d-5b99-458c-bae3-638430580400.png" 
                  alt="Martin Kozojed, Founder of Kitloop" 
                  className="rounded-lg max-w-full shadow-md object-cover max-h-80"
                />
              </div>
            </div>
          </div>
          
          {/* Optional CTA */}
          <div className="text-center mt-16">
            <Button asChild className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-white px-8 py-6 text-lg">
              <Link to="/add-rental">Join Us as a Rental Provider</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
