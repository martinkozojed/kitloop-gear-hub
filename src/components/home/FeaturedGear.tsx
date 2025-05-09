
import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const featuredGear = [
  {
    id: 1,
    name: "Alto Semi-Free Standing Ultralight Tent",
    provider: "Mountain Outfitters",
    price: 45,
    rating: 4.8,
    reviews: 32,
    image: "/lovable-uploads/c433cb7a-c6e4-4300-9a09-14559705ed9b.png",
    isNew: true
  },
  {
    id: 2,
    name: "Pursuit – Walking poles",
    provider: "TrailHead Rentals",
    price: 15,
    rating: 4.9,
    reviews: 47,
    image: "/lovable-uploads/e04cfa41-e5a4-4b0c-914c-02a9442c0bf8.png"
  },
  {
    id: 3,
    name: "VF-Kit Top Shell – Via ferrata set",
    provider: "Climbing Gear Co.",
    price: 28,
    rating: 4.7,
    reviews: 19,
    image: "/lovable-uploads/bbe3efcd-78fe-4520-ae76-f2bf3f6a83ee.png"
  },
  {
    id: 4,
    name: "Crag Sender Helmet – Climbing helmet",
    provider: "Summit Supplies",
    price: 12,
    rating: 4.8,
    reviews: 53,
    image: "/lovable-uploads/cae29bc2-b0eb-43c8-af39-9fb4149ead72.png"
  },
  {
    id: 5,
    name: "Nest Roof Tent",
    provider: "Adventure Gear",
    price: 125,
    rating: 5.0,
    reviews: 8,
    image: "/lovable-uploads/3b6f4981-b87f-4129-815e-c665b5e9e013.png",
    isNew: true
  },
  {
    id: 6,
    name: "BD - Recon X Avy set",
    provider: "Backcountry Safety",
    price: 42,
    rating: 4.9,
    reviews: 26,
    image: "/lovable-uploads/db356eb4-958b-4bdf-b937-0c2f35cc1772.png"
  },
  {
    id: 7,
    name: "Osprey Exos 48 – Walking backpack",
    provider: "Hiker's Haven",
    price: 32,
    rating: 4.8,
    reviews: 72,
    image: "/lovable-uploads/11b0bdf4-7ffe-4dc0-9dd9-f3570c833286.png"
  },
  {
    id: 8,
    name: "Tatonka Women's Yukon 60+10 Backpack",
    provider: "Mountain Equipment",
    price: 36,
    rating: 4.6,
    reviews: 41,
    image: "/lovable-uploads/35312d79-2e63-4d88-a34b-b4384fb73ce0.png"
  },
  {
    id: 9,
    name: "Waterproof W5 3.5mm Men Fullsuit EOL",
    provider: "Watersports Gear",
    price: 65,
    rating: 4.7,
    reviews: 15,
    image: "/lovable-uploads/3db3441f-4881-4b4b-8b85-07fbaa18f183.png"
  },
  {
    id: 10,
    name: "SPEEDY Canyoning backpack 45L – V2",
    provider: "Expedition Ready",
    price: 38,
    rating: 4.8,
    reviews: 23,
    image: "/lovable-uploads/2af77df2-0b20-4124-8c0c-182bcf575710.png"
  },
  {
    id: 11,
    name: "COMFY CANYON V2 HARNESS",
    provider: "Rock Climbing Co.",
    price: 25,
    rating: 4.9,
    reviews: 37,
    image: "/lovable-uploads/76acf454-3f94-4523-8099-53e55743e183.png"
  },
  {
    id: 12,
    name: "Petzl Quark Ice Axes",
    provider: "Alpine Gear",
    price: 30,
    rating: 4.7,
    reviews: 29,
    image: "/lovable-uploads/44852bd8-e6ff-40d7-8d82-7c15a60583d4.png"
  },
  {
    id: 13,
    name: "Explorer Inflatable Kayak (1/2 Seater)",
    provider: "River Rush Co.",
    price: 55,
    rating: 4.8,
    reviews: 44,
    image: "/lovable-uploads/a2377e79-7615-420d-bcd1-51b1841aef0f.png"
  },
  {
    id: 14,
    name: "Tubbs Flex TRK 24 – Snowshoes",
    provider: "Winter Sports Outlet",
    price: 28,
    rating: 4.6,
    reviews: 31,
    image: "/lovable-uploads/5cd41bd7-3f58-441a-98d7-427a756f161c.png"
  },
  {
    id: 15,
    name: "Grivel G12 – Crampons",
    provider: "Ice Climbing Gear",
    price: 22,
    rating: 4.7,
    reviews: 18,
    image: "/lovable-uploads/e00435fd-aaea-4cc3-91f4-84f857fe7d4e.png"
  },
  {
    id: 16,
    name: "OEX Heiro Solo Stove",
    provider: "Camping Supplies Co.",
    price: 18,
    rating: 4.9,
    reviews: 58,
    image: "/lovable-uploads/bf2aec13-e8de-4df5-84be-f60db05f0b2a.png"
  }
];

const GearCard = ({ item }: { item: typeof featuredGear[0] }) => {
  return (
    <Card className="overflow-hidden border-none shadow-md hover-lift h-full flex flex-col">
      <div className="relative h-52 bg-white">
        {item.isNew && (
          <Badge className="absolute top-2 right-2 bg-kitloop-accent text-white">New</Badge>
        )}
        <img 
          src={item.image} 
          alt={item.name} 
          className="h-full w-full object-contain p-4"
        />
      </div>
      <CardContent className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg line-clamp-2">{item.name}</h3>
          <p className="font-bold text-kitloop-text whitespace-nowrap ml-2">${item.price}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{item.provider}</p>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1 text-sm font-medium">{item.rating}</span>
          <span className="text-sm text-muted-foreground ml-1">({item.reviews})</span>
        </div>
        <Button size="sm" className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-white">
          Reserve
        </Button>
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredGear.map(item => (
            <GearCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedGear;
