
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  {
    id: 1,
    name: "Camping",
    icon: "tent",
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80"
  },
  {
    id: 2,
    name: "Hiking",
    icon: "backpack",
    image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80"
  },
  {
    id: 3,
    name: "Winter Sports",
    icon: "snow",
    image: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?auto=format&fit=crop&q=80"
  },
  {
    id: 4,
    name: "Water Activities",
    icon: "waves",
    image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80"
  }
];

const CategoryCard = ({ category }: { category: typeof categories[0] }) => {
  return (
    <Card className="overflow-hidden border-none shadow-md hover-lift group cursor-pointer">
      <CardContent className="p-0 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <img 
          src={category.image} 
          alt={category.name} 
          className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <h3 className="text-white text-xl font-semibold">{category.name}</h3>
        </div>
      </CardContent>
    </Card>
  );
};

const CategorySection = () => {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Explore by Category</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          Find the perfect gear for your next outdoor adventure
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
