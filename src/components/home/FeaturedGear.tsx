import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import ReservationModal from "@/components/reservations/ReservationModal";

type FeaturedGearItem = Database["public"]["Tables"]["featured_gear"]["Row"];

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
  { match: /stan husky|tent/i, url: "/lovable-uploads/images.jpeg" },
];

const getNameOverride = (name: string | null) => {
  if (!name) return undefined;
  return nameOverrides.find((k) => k.match.test(name))?.url;
};

const GearCard = ({ item, onReserve }: { item: FeaturedGearItem; onReserve: (item: FeaturedGearItem) => void }) => {
  const overrideImage = getNameOverride(item.name);
  const primaryImage = item.image_url || overrideImage || "/placeholder.svg";

  return (
    <Card className="group overflow-hidden border-none shadow-md hover:-translate-y-1 hover:shadow-lg transition-transform h-full flex flex-col">
      <div className="relative h-52 bg-background flex items-center justify-center">
        {item.is_new && (
          <Badge className="absolute top-2 right-2">New</Badge>
        )}
        <img
          src={primaryImage}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.dataset.fallbackApplied === "true") {
              img.src = "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png";
            } else {
              img.dataset.fallbackApplied = "true";
              img.src = overrideImage || "/lovable-uploads/6778c187-b493-46d5-9b24-d7cb03212796.png";
            }
          }}
          alt={item.name ?? ''}
          className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <CardContent className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg line-clamp-2">{item.name}</h3>
          <p className="font-bold text-green-600 whitespace-nowrap ml-2">
            ${item.price}
            <span className="text-sm font-normal text-muted-foreground">/day</span>
          </p>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{item.provider}</p>
        <p className="text-muted-foreground text-xs">Camping gear • Prague</p>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1 text-sm font-medium">{item.rating}</span>
          <span className="text-sm text-muted-foreground ml-1">({item.reviews})</span>
        </div>
        <Button size="sm" variant="primary" onClick={() => onReserve(item)}>
          Reserve
        </Button>
      </CardFooter>
    </Card>
  );
};

const FeaturedGear = () => {
  const [gearList, setGearList] = useState<FeaturedGearItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedGear, setSelectedGear] = useState<{
    id: string;
    name: string;
    price_per_day: number | null;
    provider_id: string;
    image_url?: string | null;
  } | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchGear = async () => {
      const { data, error } = await supabase
        .from("featured_gear")
        .select("*");

      if (error) {
        console.error("❌ Error fetching featured gear:", error.message);
      } else {
        setGearList(data ?? []);
      }
      setLoading(false);
    };

    fetchGear();
  }, []);

  const handleReserve = async (item: FeaturedGearItem) => {
    try {
      const { data, error } = await supabase
        .from("gear_items")
        .select("id, name, price_per_day, provider_id, image_url")
        .eq("id", item.id)
        .single();

      if (error || !data) {
        console.error("Could not fetch gear details", error);
        return;
      }

      if (!data.provider_id) {
        console.error("Provider information missing");
        return;
      }

      setSelectedGear({
        id: data.id,
        name: data.name ?? item.name ?? 'Unknown Item',  // Handle both data.name and item.name being null
        price_per_day: data.price_per_day,
        provider_id: data.provider_id ?? '',  // Ensure provider_id is never null
        image_url: data.image_url || item.image_url
      });

    } catch (err) {
      console.error("Failed to prepare reservation:", err);
    }
  };

  const displayedGear = showAll ? gearList : gearList.slice(0, 8);

  return (
    <section className="py-16 px-6 bg-background">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Featured Gear</h2>
        <p className="text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
          Popular equipment available for your next adventure
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))
            : displayedGear.map((item) => (
              <GearCard key={item.id} item={item} onReserve={handleReserve} />
            ))}
        </div>

        {gearList.length > 8 && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? t("featured.collapse") : t("featured.expand")}
            </Button>
          </div>
        )}
      </div>

      {selectedGear && (
        <ReservationModal
          isOpen={!!selectedGear}
          onClose={() => setSelectedGear(null)}
          gearItem={selectedGear}
        />
      )}
    </section>
  );
};

export default FeaturedGear;
