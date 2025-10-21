
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const categories = [
  {
    id: 1,
    name: "camping",
    icon: "tent",
    image: "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png" // Camping tent in mountains
  },
  {
    id: 2,
    name: "hiking",
    icon: "backpack",
    image: "/lovable-uploads/8c197f4e-9994-4393-810c-42cba6dc7bee.png" // Hiker with backpack
  },
  {
    id: 3,
    name: "winter_sports",
    icon: "snow",
    image: "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png" // Skier on slope
  },
  {
    id: 4,
    name: "water_activities",
    icon: "waves",
    image: "/lovable-uploads/0d452104-c701-45c2-b3e8-5edd90de63fa.png" // Rafting gear
  }
];

const CategoryCard = ({ category }: { category: typeof categories[0] }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const handleClick = () => {
    navigate(`/browse?category=${encodeURIComponent(category.name.toLowerCase())}`);
  };
  
  return (
    <Card
      className="overflow-hidden border-none shadow-md hover-lift group cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <CardContent className="p-0 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <div className="h-64 w-full overflow-hidden">
          <img 
            src={category.image} 
            alt={t(`categories.${category.name}`)} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <h3 className="text-white text-xl font-semibold">{t(`categories.${category.name}`)}</h3>
        </div>
      </CardContent>
    </Card>
  );
};

const CategorySection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16 px-6 bg-background">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">{t('categories.title')}</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          {t('categories.description')}
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
