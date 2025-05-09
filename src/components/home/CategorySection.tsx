
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  {
    id: 1,
    name: "Camping",
    icon: "tent",
    image: "/lovable-uploads/c433cb7a-c6e4-4300-9a09-14559705ed9b.png" // Green tent
  },
  {
    id: 2,
    name: "Hiking",
    icon: "backpack",
    image: "/lovable-uploads/11b0bdf4-7ffe-4dc0-9dd9-f3570c833286.png" // Blue backpack
  },
  {
    id: 3,
    name: "Winter Sports",
    icon: "snow",
    image: "/lovable-uploads/5cd41bd7-3f58-441a-98d7-427a756f161c.png" // Snowshoes
  },
  {
    id: 4,
    name: "Water Activities",
    icon: "waves",
    image: "/lovable-uploads/77567aaf-59d0-4767-a072-a089c59a834f.png" // Paddleboard
  }
];

const CategoryCard = ({ category }: { category: typeof categories[0] }) => {
  return (
    <Card className="overflow-hidden border-none shadow-md hover-lift group cursor-pointer">
      <CardContent className="p-0 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <div className="h-64 w-full overflow-hidden">
          <img 
            src={category.image} 
            alt={category.name} 
            className="h-full w-full object-contain bg-white p-2 transition-transform duration-500 group-hover:scale-105"
          />
        </div>
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
