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
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import ReservationModal from "@/components/reservations/ReservationModal";

const keywordFallbacks: { match: RegExp; url: string }[] = [
  { match: /stan|tent/i, url: "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png" },
  { match: /spac[aá]k|sleep/i, url: "/lovable-uploads/35312d79-2e63-4d88-a34b-b4384fb73ce0.png" },
  { match: /harnes|sed[aá]k|uvaz|ferrat/i, url: "/lovable-uploads/76acf454-3f94-4523-8099-53e55743e183.png" },
  { match: /poles?|hole/i, url: "/lovable-uploads/8c197f4e-9994-4393-810c-42cba6dc7bee.png" },
  { match: /wetsuit|neopren|dive|surf/i, url: "/lovable-uploads/3db3441f-4881-4b4b-8b85-07fbaa18f183.png" },
  { match: /bike|kolo/i, url: "/lovable-uploads/35312d79-2e63-4d88-a34b-b4384fb73ce0.png" },
  { match: /ly[zž]e|skialp|snow|sne[zž]/i, url: "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png" },
];

const nameOverrides: { match: RegExp; url: string }[] = [
  { match: /trekking boots/i, url: "/lovable-uploads/licensed-image-4.jpeg" },
  { match: /bivouac/i, url: "/lovable-uploads/licensed-image-2.jpeg" },
  { match: /dry bag/i, url: "/lovable-uploads/licensed-image-3.jpeg" },
  { match: /crampons|ma[cč]ky/i, url: "/lovable-uploads/licensed-image-9.jpeg" },
  { match: /ferratov[aá].*helma|helmet/i, url: "/lovable-uploads/licensed-image-6.jpeg" },
  { match: /ferrata.*set|kompletn[ií].*ferrata/i, url: "/lovable-uploads/39d5c971-2de5-4b77-bceb-726d5c0a8fa0.png" },
  { match: /postroj|brzda|belay/i, url: "/lovable-uploads/licensed-image-7.jpeg" },
  { match: /expres|quickdraw/i, url: "/lovable-uploads/licensed-image-8.jpeg" },
  { match: /sneznice|snowshoes/i, url: "/lovable-uploads/licensed-image-10.jpeg" },
  { match: /skialp|ly[zž]e.*p[aá]sy/i, url: "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png" },
  { match: /stan husky/i, url: "/lovable-uploads/images.jpeg" },
];

const categoryPools: Record<string, string[]> = {
  camping: [
    "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png",
    "/lovable-uploads/0d452104-c701-45c2-b3e8-5edd90de63fa.png",
    "/lovable-uploads/77567aaf-59d0-4767-a072-a089c59a834f.png",
  ],
  hiking: [
    "/lovable-uploads/8c197f4e-9994-4393-810c-42cba6dc7bee.png",
    "/lovable-uploads/35312d79-2e63-4d88-a34b-b4384fb73ce0.png",
    "/lovable-uploads/17170a90-3ec5-49b1-a678-45ac01d0347f.png",
  ],
  climbing: [
    "/lovable-uploads/76acf454-3f94-4523-8099-53e55743e183.png",
    "/lovable-uploads/94af71de-1d1b-45ae-8828-88a9bcb44e67.png",
    "/lovable-uploads/cd417d02-76b3-4d6d-8eac-6d74127d738d.png",
  ],
  ferraty: [
    "/lovable-uploads/76acf454-3f94-4523-8099-53e55743e183.png",
    "/lovable-uploads/cd417d02-76b3-4d6d-8eac-6d74127d738d.png",
  ],
  lezeni: [
    "/lovable-uploads/76acf454-3f94-4523-8099-53e55743e183.png",
    "/lovable-uploads/cd417d02-76b3-4d6d-8eac-6d74127d738d.png",
  ],
  winter_sports: [
    "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png",
    "/lovable-uploads/de958e3d-2bfb-41fe-a6ca-a72f28abd111.png",
  ],
  zimni: [
    "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png",
    "/lovable-uploads/de958e3d-2bfb-41fe-a6ca-a72f28abd111.png",
  ],
  skialpinismus: [
    "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png",
    "/lovable-uploads/de958e3d-2bfb-41fe-a6ca-a72f28abd111.png",
  ],
  water_activities: [
    "/lovable-uploads/0d452104-c701-45c2-b3e8-5edd90de63fa.png",
    "/lovable-uploads/3db3441f-4881-4b4b-8b85-07fbaa18f183.png",
    "/lovable-uploads/eb04220f-7940-4149-b09a-070188f4daa7.png",
  ],
  cyklo: [
    "/lovable-uploads/35312d79-2e63-4d88-a34b-b4384fb73ce0.png",
    "/lovable-uploads/ba1c3e81-079d-4427-b8fc-57cfc7626b99.png",
  ],
};

const defaultPool = [
  "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png",
  "/lovable-uploads/8c197f4e-9994-4393-810c-42cba6dc7bee.png",
  "/lovable-uploads/80cc8869-5dfd-4ef3-9de7-2602a29978d8.png",
  "/lovable-uploads/0d452104-c701-45c2-b3e8-5edd90de63fa.png",
  "/lovable-uploads/76acf454-3f94-4523-8099-53e55743e183.png",
  "/lovable-uploads/35312d79-2e63-4d88-a34b-b4384fb73ce0.png",
  "/lovable-uploads/3db3441f-4881-4b4b-8b85-07fbaa18f183.png",
  "/lovable-uploads/17170a90-3ec5-49b1-a678-45ac01d0347f.png",
  "/lovable-uploads/77567aaf-59d0-4767-a072-a089c59a834f.png",
  "/lovable-uploads/de958e3d-2bfb-41fe-a6ca-a72f28abd111.png",
  "/lovable-uploads/ba1c3e81-079d-4427-b8fc-57cfc7626b99.png",
  "/lovable-uploads/eb04220f-7940-4149-b09a-070188f4daa7.png",
  "/lovable-uploads/cb959978-aea6-4b3d-841b-f06a692f87ce.png",
  "/lovable-uploads/b1f0a36d-5b99-458c-bae3-638430580400.png",
  "/lovable-uploads/94af71de-1d1b-45ae-8828-88a9bcb44e67.png",
];

const pickFromPool = (pool: string[], seed: string) => {
  if (pool.length === 0) return "/placeholder.svg";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // keep 32bit
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
};

const getFallbackImage = (gear: GearItem) => {
  const category = (gear.category || "").toLowerCase();
  const name = gear.name || "";

  const override = nameOverrides.find((k) => k.match.test(name));
  if (override?.url) return override.url;

  const keyword = keywordFallbacks.find((k) => k.match.test(name));
  if (keyword?.url) return keyword.url;

  const pool =
    categoryPools[category] ||
    categoryPools[category.split(" ").join("_")] ||
    defaultPool;

  return pickFromPool(pool, name || category || gear.id || "kitloop");
};

type GearImage = Pick<Database["public"]["Tables"]["gear_images"]["Row"], "url" | "sort_order">;
type GearItem = Database["public"]["Tables"]["gear_items"]["Row"] & {
  gear_images?: GearImage[];
  display_image_url?: string | null;
};


const BrowseGear = () => {
  const [gearList, setGearList] = useState<GearItem[]>([]);
  const [filteredGear, setFilteredGear] = useState<GearItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedGear, setSelectedGear] = useState<GearItem | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleReserve = (gear: GearItem) => {
    setSelectedGear(gear);
  };

  useEffect(() => {
    const fetchGear = async () => {
      // Inventory 2.0 Query: Fetch Products
      // TODO: Filter only products that have at least one 'available' asset?
      // For MVP, just show all products.
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          category,
          description,
          image_url,
          base_price_cents,
          provider_id,
          product_variants (
            id,
            name
          )
        `);

      if (error) {
        console.error("Error fetching products:", error.message);
      } else {
        const normalized: GearItem[] = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          price_per_day: p.base_price_cents ? p.base_price_cents / 100 : 0,
          image_url: p.image_url,
          provider_id: p.provider_id,
          // Legacy compatibility
          gear_images: [],
          rating: 5.0, // Default for new items
          location: "Prague" // Placeholder until we join Provider address
        } as unknown as GearItem));
        setGearList(normalized);
      }
    };
    fetchGear();
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const search = queryParams.get("query") || "";
    if (!searchQuery) setSearchQuery(search);

    let filtered = gearList.filter((gear) => {
      const matchesSearch = (gear.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesLocation = (gear.location ?? "").toLowerCase().includes(locationQuery.toLowerCase());
      const category = (gear as GearItem & { category?: string }).category;
      const matchesCategory = selectedCategories.length === 0 || (category ? selectedCategories.includes(category) : true);
      const rating = gear.rating ?? 0;
      const matchesRating = selectedRatings.length === 0 || selectedRatings.some((r) => rating >= parseFloat(r));
      const price = gear.price_per_day ?? 0;
      const matchesPrice = (!minPrice || price >= parseFloat(minPrice)) && (!maxPrice || price <= parseFloat(maxPrice));
      return matchesSearch && matchesLocation && matchesCategory && matchesRating && matchesPrice;
    });

    if (sortOption === "price-asc") {
      filtered = [...filtered].sort((a, b) => (a.price_per_day ?? 0) - (b.price_per_day ?? 0));
    } else if (sortOption === "price-desc") {
      filtered = [...filtered].sort((a, b) => (b.price_per_day ?? 0) - (a.price_per_day ?? 0));
    }

    setFilteredGear(filtered);
  }, [
    gearList,
    location.search,
    sortOption,
    locationQuery,
    selectedCategories,
    selectedRatings,
    minPrice,
    maxPrice,
    searchQuery,
  ]);

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

  // GearCard component inside to access handlers if needed, or just defined here for simplicity as before
  const GearCard = ({ gear }: { gear: GearItem }) => {
    const fallbackImage = getFallbackImage(gear);
    const primaryImage = gear.display_image_url || gear.image_url || fallbackImage;

    return (
      <Card className="overflow-hidden rounded-2xl transition-transform hover:shadow-xl hover:-translate-y-1">
        <div className="relative">
          <AspectRatio ratio={4 / 3}>
            <img
              src={primaryImage}
              alt={gear.name ?? ""}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.dataset.fallbackApplied === "true") {
                  img.src = "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png";
                } else {
                  img.dataset.fallbackApplied = "true";
                  img.src = fallbackImage;
                }
              }}
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
            <Button size="sm" className="text-sm px-4 py-1.5" onClick={() => handleReserve(gear)}>
              Reserve
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="bg-kitloop-background min-h-screen">
      <section className="bg-gradient-to-br from-green-100 to-white py-24 px-4 border-b border-border">
        {/* ... (Header content irrelevant for this change) */}
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("browse.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            {t("browse.subtitle")}
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3 bg-white shadow-md p-4 rounded-2xl max-w-4xl mx-auto">
            <div className="relative flex-1 w-full">
              <Input placeholder="Search gear..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            </div>
            <div className="relative flex-1 w-full">
              <Input placeholder="Location..." value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} className="pl-10 h-12" />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">📍</div>
            </div>
            <Button type="submit" className="h-12 px-6 text-base">{t("browse.search") || "Search"}</Button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-10">
          <aside className="w-full lg:w-64 shrink-0 sticky top-24 self-start bg-white p-5 rounded-2xl shadow">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <Accordion type="multiple" defaultValue={["category", "rating"]}>
              <AccordionItem value="category">
                <AccordionTrigger>Category</AccordionTrigger>
                <AccordionContent>
                  {["camping", "hiking", "climbing"].map((cat) => (
                    <div key={cat} className="flex items-center space-x-2 mb-2">
                      <Checkbox id={`cat-${cat}`} checked={selectedCategories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
                      <label htmlFor={`cat-${cat}`} className="text-sm capitalize">{cat}</label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="rating">
                <AccordionTrigger>Rating</AccordionTrigger>
                <AccordionContent>
                  {["4", "3"].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2 mb-2">
                      <Checkbox id={`rate-${rating}`} checked={selectedRatings.includes(rating)} onCheckedChange={() => toggleRating(rating)} />
                      <label htmlFor={`rate-${rating}`} className="text-sm">{rating}+ stars</label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="price">
                <AccordionTrigger>Price</AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-2 mt-2">
                    <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full" />
                    <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full" />
                  </div>
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

      {selectedGear && (
        <ReservationModal
          isOpen={!!selectedGear}
          onClose={() => setSelectedGear(null)}
          gearItem={{
            id: selectedGear.id,
            name: selectedGear.name || "Unknown Gear",
            price_per_day: selectedGear.price_per_day,
            provider_id: selectedGear.provider_id ?? "",
            image_url: selectedGear.display_image_url || null
          }}
        />
      )}
    </div>
  );
};

export default BrowseGear;
