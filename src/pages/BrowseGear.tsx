import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Search, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type GearItem = Database["public"]["Tables"]["gear_items"]["Row"];

const GearCard = ({ gear }: { gear: GearItem }) => {
  return (
    <Card className="overflow-hidden rounded-2xl transition-transform hover:shadow-xl hover:-translate-y-1">
      <div className="relative">
        <AspectRatio ratio={4 / 3}>
          <img
            src={gear.image_url || "/placeholder.svg"}
            alt={gear.name ?? ""}
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")}
            className="w-full h-full object-cover"
          />
        </AspectRatio>
        <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1 text-xs font-medium flex items-center shadow-sm">
          <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-400 mr-1" />
          {gear.rating}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="text-base font-semibold leading-tight line-clamp-2 h-10">
          {gear.name}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <p className="text-green-600 font-semibold text-sm">
            {gear.price_per_day} CZK/day
          </p>
          <Button size="sm" className="text-sm px-4 py-1.5">
            Reserve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const BrowseGear = () => {
  const [gearList, setGearList] = useState<GearItem[]>([]);
  const [filteredGear, setFilteredGear] = useState<GearItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load gear items from Supabase on mount
  useEffect(() => {
    const fetchGear = async () => {
      const { data, error } = await supabase.from("gear_items").select("*");
      if (error) {
        console.error("Error fetching gear items:", error.message);
      } else {
        setGearList(data ?? []);
      }
    };

    fetchGear();
  }, []);

  // Filter gear whenever search params or filters change
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const search = queryParams.get("query") || "";

    if (!searchQuery) {
      setSearchQuery(search);
    }

    let filtered = gearList.filter((gear) => {
      const matchesSearch = (gear.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesLocation = (gear.location ?? "").toLowerCase().includes(locationQuery.toLowerCase());
      const category = (gear as any).category as string | undefined;
      const matchesCategory = selectedCategories.length === 0 || (category ? selectedCategories.includes(category) : true);
      const rating = gear.rating ?? 0;
      const matchesRating = selectedRatings.length === 0 || selectedRatings.some((r) => rating >= parseFloat(r));
      return matchesSearch && matchesLocation && matchesCategory && matchesRating;
    });

    if (sortOption === "price-asc") {
      filtered = [...filtered].sort((a, b) => (a.price_per_day ?? 0) - (b.price_per_day ?? 0));
    } else if (sortOption === "price-desc") {
      filtered = [...filtered].sort((a, b) => (b.price_per_day ?? 0) - (a.price_per_day ?? 0));
    }

    setFilteredGear(filtered);
  }, [gearList, location.search, sortOption, locationQuery, selectedCategories, selectedRatings]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    navigate(`/browse?${params.toString()}`);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleRating = (rating: string) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  return (
    <div className="bg-kitloop-background min-h-screen">
      <section className="bg-gradient-to-br from-green-100 to-white py-24 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("browse.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            {t("browse.subtitle")}
          </p>
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row items-center gap-3 bg-white shadow-md p-4 rounded-2xl max-w-4xl mx-auto"
          >
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            </div>
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Location..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="pl-10 h-12"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">📍</div>
            </div>
            <Button type="submit" className="h-12 px-6 text-base">
              {t("browse.search") || "Search"}
            </Button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="w-full lg:w-64 shrink-0 bg-white p-5 rounded-2xl shadow">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <Accordion type="multiple" defaultValue={["category", "rating"]}>
              <AccordionItem value="category">
                <AccordionTrigger>Category</AccordionTrigger>
                <AccordionContent>
                  {['camping', 'hiking', 'climbing'].map((cat) => (
                    <div key={cat} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`cat-${cat}`}
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                      />
                      <label htmlFor={`cat-${cat}`} className="text-sm capitalize">
                        {cat}
                      </label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="rating">
                <AccordionTrigger>Rating</AccordionTrigger>
                <AccordionContent>
                  {['4', '3'].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`rate-${rating}`}
                        checked={selectedRatings.includes(rating)}
                        onCheckedChange={() => toggleRating(rating)}
                      />
                      <label htmlFor={`rate-${rating}`} className="text-sm">
                        {rating}+ stars
                      </label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </aside>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Available Gear</h2>
              <Select onValueChange={setSortOption}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredGear.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGear.map((gear) => (
                  <GearCard key={gear.id} gear={gear} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground mt-6">
                <p className="text-lg">{t("browse.no_gear_found")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseGear;
