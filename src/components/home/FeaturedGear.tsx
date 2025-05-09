
import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const featuredGear = [
  {
    id: 1,
    name: "Tent Scorpion 2 IX™ Snugpak®",
    provider: "Mountain Outfitters",
    price: 35,
    rating: 4.8,
    reviews: 124,
    image: "/lovable-uploads/6389c2fc-8fc7-4f5a-bdd7-e30cd31b993b.png"
  },
  {
    id: 2,
    name: "Tent Journey Solo Snugpak®",
    provider: "TrailHead Rentals",
    price: 22,
    rating: 4.9,
    reviews: 87,
    image: "/lovable-uploads/eb04220f-7940-4149-b09a-070188f4daa7.png"
  },
  {
    id: 3,
    name: "Ocún Via Ferrata Twist Shard",
    provider: "Climbing Gear Co.",
    price: 15,
    rating: 4.7,
    reviews: 63,
    image: "/lovable-uploads/e85ead85-a219-4e66-aa19-679ac4e42083.png"
  },
  {
    id: 4,
    name: "Singing Rock Phario Palm",
    provider: "Summit Supplies",
    price: 18,
    rating: 4.5,
    reviews: 42,
    image: "/lovable-uploads/cd417d02-76b3-4d6d-8eac-6d74127d738d.png"
  },
  {
    id: 5,
    name: "Petzl Sirocco",
    provider: "Adventure Gear",
    price: 12,
    rating: 4.9,
    reviews: 79,
    image: "/lovable-uploads/cff39c98-70b4-4188-b5f5-cf580f44aeb0.png"
  },
  {
    id: 6,
    name: "Osprey Volt 65",
    provider: "BackCountry Rentals",
    price: 28,
    rating: 4.8,
    reviews: 103,
    image: "/lovable-uploads/de958e3d-2bfb-41fe-a6ca-a72f28abd111.png"
  },
  {
    id: 7,
    name: "Black Diamond Trail Back Burnt Sienna",
    provider: "Hiker's Haven",
    price: 14,
    rating: 4.6,
    reviews: 58,
    image: "/lovable-uploads/94af71de-1d1b-45ae-8828-88a9bcb44e67.png"
  },
  {
    id: 8,
    name: "Alpin Tour Plus – with Dragon-Tour leash",
    provider: "Mountain Equipment",
    price: 24,
    rating: 4.7,
    reviews: 61,
    image: "/lovable-uploads/17170a90-3ec5-49b1-a678-45ac01d0347f.png"
  },
  {
    id: 9,
    name: "Petzl Ergonomic",
    provider: "Ice Climbing Rentals",
    price: 32,
    rating: 4.9,
    reviews: 47,
    image: "/lovable-uploads/cb959978-aea6-4b3d-841b-f06a692f87ce.png"
  },
  {
    id: 10,
    name: "Petzl Crevasse Rescue Kit",
    provider: "Glacier Guides",
    price: 45,
    rating: 5.0,
    reviews: 39,
    image: "/lovable-uploads/ba1c3e81-079d-4427-b8fc-57cfc7626b99.png"
  },
  {
    id: 11,
    name: "Sport - BD - Recon X Avy set",
    provider: "Avalanche Safety",
    price: 55,
    rating: 4.9,
    reviews: 28,
    image: "/lovable-uploads/81d4cb00-2d0d-430c-ab18-bae417eca059.png"
  },
  {
    id: 12,
    name: "Switchback 32",
    provider: "Ortovox Official",
    price: 38,
    rating: 4.7,
    reviews: 52,
    image: "/lovable-uploads/447642a9-6447-46bd-a750-77dc8ba0fb6c.png"
  }
];

const GearCard = ({ item }: { item: typeof featuredGear[0] }) => {
  return (
    <Card className="overflow-hidden border-none shadow-md hover-lift h-full flex flex-col">
      <div className="relative h-52">
        <img 
          src={item.image} 
          alt={item.name} 
          className="h-full w-full object-contain p-4"
        />
      </div>
      <CardContent className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="font-bold text-kitloop-text">${item.price}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{item.provider}</p>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1 text-sm font-medium">{item.rating}</span>
          <span className="text-sm text-muted-foreground ml-1">({item.reviews} reviews)</span>
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
