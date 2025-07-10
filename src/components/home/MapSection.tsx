
import React from 'react';
import { Card } from "@/components/ui/card";

const MapSection = () => {
  return (
    <section className="py-16 px-6 bg-kitloop-background">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">Find Gear Near You</h2>
            <p className="text-lg mb-6">
              Kitloop connects you with local rental shops and individual providers in your area. No need to travel far to get quality outdoor equipment.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full p-1 mr-3 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>Over 500 verified rental providers nationwide</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full p-1 mr-3 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>Easy pickup options or delivery available</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full p-1 mr-3 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>See real-time availability and book instantly</span>
              </li>
            </ul>
          </div>
          
          <div className="flex-1">
            <Card className="overflow-hidden border-none shadow-lg rounded-xl">
              <div className="bg-kitloop-medium-gray h-64 sm:h-80 lg:h-96 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">Interactive map showing nearby rental options would be displayed here</p>
                </div>
                <div className="absolute bottom-4 right-4 bg-background p-3 rounded-lg shadow-md">
                  <p className="font-medium text-sm">24 providers near you</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
