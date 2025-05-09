
import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";

const featuredGear = [
  {
    id: 1,
    name: "2-Person Backpacking Tent",
    provider: "Mountain Outfitters",
    price: 35,
    rating: 4.8,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&q=80"
  },
  {
    id: 2,
    name: "Osprey Hiking Backpack",
    provider: "TrailHead Rentals",
    price: 22,
    rating: 4.9,
    reviews: 87,
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80"
  },
  {
    id: 3,
    name: "Premium Snowboard Kit",
    provider: "SnowGear Co.",
    price: 55,
    rating: 4.7,
    reviews: 63,
    image: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?auto=format&fit=crop&q=80"
  }
];

const GearCard = ({ item }: { item: typeof featuredGear[0] }) => {
  return (
    <Card className="overflow-hidden border-none shadow-md hover-lift h-full flex flex-col">
      <div className="relative h-52">
        <img 
          src={item.image} 
          alt={item.name} 
          className="h-full w-full object-cover"
        />
      </div>
      <CardContent className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="font-bold text-kitloop-text">${item.price}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{item.provider}</p>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t border-gray-100">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1 text-sm font-medium">{item.rating}</span>
          <span className="text-sm text-muted-foreground ml-1">({item.reviews} reviews)</span>
        </div>
      </CardFooter>
    </Card>
  );
};

const FeaturedGear = () => {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Featured Gear</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          Popular equipment available for your next adventure
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredGear.map(item => (
            <GearCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedGear;
