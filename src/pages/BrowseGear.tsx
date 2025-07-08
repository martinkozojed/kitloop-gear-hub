import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Search, Filter, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

// Sample gear data
const sampleGear = [
  {
    id: 1,
    name: "Alto Semi-Free Standing Ultralight Tent",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
    price: 350,
    rating: 4.8,
    category: "camping"
  },
  {
    id: 2,
    name: "Pursuit – Walking poles",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
    price: 120,
    rating: 4.5,
    category: "hiking"
  },
  {
    id: 3,
    name: "VF-Kit Top Shell – Via ferrata set",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
    price: 280,
    rating: 4.9,
    category: "climbing"
  }
  // ... další produkty
];

const categories = ["camping", "hiking", "climbing", "winter_sports", "water_activities"];
const priceRanges = ["0-100", "100-200", "200-300", "300+"];
const ratings = ["4+", "3+", "All"];

const GearCard = ({ gear }: { gear: typeof sampleGear[0] }) => {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden rounded-xl ring-1 ring-muted hover:shadow-lg transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-0">
      <div className="relative">
        <AspectRatio ratio={4 / 3}>
          <img src={gear.image} alt={gear.name} className="w-full h-full object-cover" />
        </AspectRatio>
        <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-sm font-medium flex items-center">
          <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-400 mr-1" />
          {gear.rating}
        </div>
      </div>
      <CardContent className="p-4 md:p-5">
        <h3 className="font-medium line-clamp-2 mb-2 h-12">{gear.name}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="font-bold text-green-600">{gear.price} CZK/day</p>
          <Button size="sm" className="w-full sm:w-auto">
            {t("browse.reserve")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FilterSidebar = ({
  onCategoryChange,
  onPriceChange,
  onRatingChange,
  selectedCategories
}: {
  onCategoryChange: (categories: string[]) => void;
  onPriceChange: (ranges: string[]) => void;
  onRatingChange: (rating: string) => void;
  selectedCategories: string[];
}) => {
  const [localSelectedCategories, setLocalSelectedCategories] = useState<string[]>(selectedCategories);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    setLocalSelectedCategories(selectedCategories);
  }, [selectedCategories]);

  const handleCategoryChange = (category: string) => {
    const newSelection = localSelectedCategories.includes(category)
      ? localSelectedCategories.filter(c => c !== category)
      : [...localSelectedCategories, category];
    setLocalSelectedCategories(newSelection);
    onCategoryChange(newSelection);
  };

  const handlePriceChange = (range: string) => {
    const newSelection = selectedPriceRanges.includes(range)
      ? selectedPriceRanges.filter(r => r !== range)
      : [...selectedPriceRanges, range];
    setSelectedPriceRanges(newSelection);
    onPriceChange(newSelection);
  };

  return (
    <div className="w-full lg:w-64 bg-white rounded-xl p-4 ring-1 ring-muted shadow-sm focus-visible:outline-none focus-visible:ring-0">
      <div className="flex items-center mb-4">
        <Filter className="h-5 w-5 mr-2 text-muted-foreground" />
        <h2 className="text-lg font-medium">{t('browse.filters')}</h2>
      </div>
      <Accordion type="multiple" defaultValue={["categories", "price", "rating"]}>
        <AccordionItem value="categories">
          <AccordionTrigger>{t('browse.categories')}</AccordionTrigger>
          <AccordionContent>
            {categories.map(category => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={localSelectedCategories.includes(category)}
                  onCheckedChange={() => handleCategoryChange(category)}
                />
                <label htmlFor={`category-${category}`} className="text-sm capitalize">
                  {t(`categories.${category}`)}
                </label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="price">
          <AccordionTrigger>{t('browse.price_range')}</AccordionTrigger>
          <AccordionContent>
            {priceRanges.map(range => (
              <div key={range} className="flex items-center space-x-2">
                <Checkbox
                  id={`price-${range}`}
                  checked={selectedPriceRanges.includes(range)}
                  onCheckedChange={() => handlePriceChange(range)}
                />
                <label htmlFor={`price-${range}`} className="text-sm">{range}</label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="rating">
          <AccordionTrigger>{t('browse.rating')}</AccordionTrigger>
          <AccordionContent>
            <Select onValueChange={onRatingChange} defaultValue="4+">
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('browse.select_rating')} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {ratings.map(rating => (
                  <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button className="w-full mt-4">{t('browse.apply_filters')}</Button>
    </div>
  );
};

const BrowseGear = () => {
  const [filteredGear, setFilteredGear] = useState(sampleGear);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const search = queryParams.get('query') || "";
    const locationParam = queryParams.get('location') || "";
    const category = queryParams.get('category');

    setSearchQuery(search);
    setLocationQuery(locationParam);
    if (category) setSelectedCategories([category]);

    let filtered = sampleGear;

    if (category) {
      filtered = filtered.filter(gear => gear.category.toLowerCase() === category);
    }

    if (search) {
      filtered = filtered.filter(gear =>
        gear.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredGear(filtered);
  }, [location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    if (selectedCategories.length > 0) {
      params.set("category", selectedCategories[0]);
    }
    navigate(`/browse?${params.toString()}`);
  };

  const handleCategoryFilter = (categories: string[]) => {
    setSelectedCategories(categories);
    const filtered = sampleGear.filter(item =>
      categories.length === 0 || categories.includes(item.category.toLowerCase())
    );
    setFilteredGear(filtered);
  };

  return (
    <div className="bg-kitloop-background min-h-screen pt-24 pb-16">
      {/* BrowseGear polished UI */}
      <section className="border-b border-border bg-muted/50 py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            {t('browse.title')}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('browse.subtitle')}
          </p>
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-xl shadow-sm max-w-3xl mx-auto"
          >
            <div className="relative flex-grow">
              <Input
                placeholder={t('browse.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-5"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative flex-grow sm:w-48">
              <Input
                placeholder={t('browse.location_placeholder')}
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="pl-10 py-5"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                📍
              </div>
            </div>
            <Button type="submit" className="py-5 px-6 text-base sm:text-lg">
              {t('browse.search')}
            </Button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-10">
        {/* BrowseGear polished UI */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <FilterSidebar
              onCategoryChange={handleCategoryFilter}
              onPriceChange={() => {}}
              onRatingChange={() => {}}
              selectedCategories={selectedCategories}
            />
          </aside>

          <main className="flex-grow">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGear.map((gear) => (
                <GearCard key={gear.id} gear={gear} />
              ))}
            </div>
            {filteredGear.length === 0 && (
              <p className="text-center text-muted-foreground mt-6">
                {t('browse.no_gear_found')}
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
export default BrowseGear;