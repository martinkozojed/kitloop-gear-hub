
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Search, Filter, Star } from "lucide-react";
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
    category: "Camping"
  },
  {
    id: 2,
    name: "Pursuit – Walking poles",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
    price: 120,
    rating: 4.5,
    category: "Hiking"
  },
  {
    id: 3,
    name: "VF-Kit Top Shell – Via ferrata set",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
    price: 280,
    rating: 4.9,
    category: "Climbing"
  },
  {
    id: 4,
    name: "Crag Sender Helmet – Climbing helmet",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    price: 150,
    rating: 4.7,
    category: "Climbing"
  },
  {
    id: 5,
    name: "Explorer | Inflatable Kayak | PU-Stitch",
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
    price: 420,
    rating: 4.6,
    category: "Water Activities"
  },
  {
    id: 6,
    name: "Flex TRK 24 – Snowshoes",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1",
    price: 180,
    rating: 4.3,
    category: "Winter Sports"
  },
  {
    id: 7,
    name: "Exos 48 – Walking backpack",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
    price: 130,
    rating: 4.4,
    category: "Hiking"
  },
  {
    id: 8,
    name: "BD - Recon X Avy set",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
    price: 490,
    rating: 5.0,
    category: "Winter Sports"
  },
];

// Filter categories
const categories = ["Camping", "Hiking", "Climbing", "Winter Sports", "Water Activities"];
const priceRanges = ["0-100", "100-200", "200-300", "300+"];
const ratings = ["4+", "3+", "All"];

const GearCard = ({ gear }: { gear: typeof sampleGear[0] }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="relative">
        <AspectRatio ratio={4/3}>
          <img 
            src={gear.image} 
            alt={gear.name} 
            className="w-full h-full object-cover"
          />
        </AspectRatio>
        <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-sm font-medium flex items-center">
          <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-400 mr-1" />
          {gear.rating}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium line-clamp-2 mb-1 h-12">{gear.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <p className="font-bold text-kitloop-accent">{gear.price} CZK/day</p>
          <Button size="sm" className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-white">
            Reserve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FilterSidebar = ({ 
  onCategoryChange, 
  onPriceChange,
  onRatingChange
}: { 
  onCategoryChange: (categories: string[]) => void;
  onPriceChange: (ranges: string[]) => void;
  onRatingChange: (rating: string) => void;
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  
  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      
      onCategoryChange(newSelection);
      return newSelection;
    });
  };
  
  const handlePriceChange = (range: string) => {
    setSelectedPriceRanges(prev => {
      const newSelection = prev.includes(range)
        ? prev.filter(r => r !== range)
        : [...prev, range];
      
      onPriceChange(newSelection);
      return newSelection;
    });
  };
  
  return (
    <div className="w-full lg:w-64 bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center mb-4">
        <Filter className="h-5 w-5 mr-2" />
        <h2 className="text-lg font-medium">Filters</h2>
      </div>
      
      <Accordion type="multiple" defaultValue={["categories", "price", "rating"]}>
        <AccordionItem value="categories">
          <AccordionTrigger>Categories</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                  />
                  <label 
                    htmlFor={`category-${category}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="price">
          <AccordionTrigger>Price Range (CZK/day)</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {priceRanges.map(range => (
                <div key={range} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`price-${range}`}
                    checked={selectedPriceRanges.includes(range)}
                    onCheckedChange={() => handlePriceChange(range)}
                  />
                  <label 
                    htmlFor={`price-${range}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {range}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="rating">
          <AccordionTrigger>Rating</AccordionTrigger>
          <AccordionContent>
            <Select onValueChange={onRatingChange} defaultValue="4+">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Rating" />
              </SelectTrigger>
              <SelectContent>
                {ratings.map(rating => (
                  <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <Button className="w-full mt-4">Apply Filters</Button>
    </div>
  );
};

const BrowseGear = () => {
  const [filteredGear, setFilteredGear] = useState(sampleGear);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("popular");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be a more sophisticated search
    const filtered = sampleGear.filter(
      gear => gear.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredGear(filtered);
  };
  
  const handleCategoryFilter = (categories: string[]) => {
    if (categories.length === 0) {
      setFilteredGear(sampleGear);
      return;
    }
    
    const filtered = sampleGear.filter(gear => 
      categories.includes(gear.category)
    );
    setFilteredGear(filtered);
  };
  
  const handlePriceFilter = (ranges: string[]) => {
    if (ranges.length === 0) {
      setFilteredGear(sampleGear);
      return;
    }
    
    const filtered = sampleGear.filter(gear => {
      return ranges.some(range => {
        if (range === "0-100") return gear.price <= 100;
        if (range === "100-200") return gear.price > 100 && gear.price <= 200;
        if (range === "200-300") return gear.price > 200 && gear.price <= 300;
        if (range === "300+") return gear.price > 300;
        return false;
      });
    });
    
    setFilteredGear(filtered);
  };
  
  const handleRatingFilter = (rating: string) => {
    let filtered = sampleGear;
    
    if (rating === "4+") {
      filtered = sampleGear.filter(gear => gear.rating >= 4);
    } else if (rating === "3+") {
      filtered = sampleGear.filter(gear => gear.rating >= 3);
    }
    
    setFilteredGear(filtered);
  };
  
  const handleSort = (option: string) => {
    setSortOption(option);
    
    let sorted = [...filteredGear];
    if (option === "price-low") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (option === "price-high") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (option === "rating") {
      sorted.sort((a, b) => b.rating - a.rating);
    }
    
    setFilteredGear(sorted);
  };
  
  return (
    <div className="bg-kitloop-background min-h-screen pt-24 pb-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Browse Available Gear</h1>
        
        {/* Search Section */}
        <div className="bg-white rounded-lg p-4 mb-8 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search for gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="md:w-48">
              <Input 
                placeholder="Location..."
                className="w-full"
              />
            </div>
            <Button type="submit" className="bg-kitloop-accent hover:bg-kitloop-accent-hover text-white">
              Search
            </Button>
          </form>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <FilterSidebar 
              onCategoryChange={handleCategoryFilter}
              onPriceChange={handlePriceFilter}
              onRatingChange={handleRatingFilter}
            />
          </aside>
          
          {/* Main Content */}
          <main className="flex-grow">
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-gray-500">
                Showing {filteredGear.length} items
              </p>
              
              <Select defaultValue="popular" onValueChange={handleSort}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {filteredGear.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-lg">No gear found matching your criteria.</p>
                <Button 
                  onClick={() => setFilteredGear(sampleGear)} 
                  variant="outline" 
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGear.map(gear => (
                  <GearCard key={gear.id} gear={gear} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default BrowseGear;
