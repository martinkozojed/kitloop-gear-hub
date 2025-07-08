import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";


type FeaturedGearItem = Database["public"]["Tables"]["featured_gear"]["Row"];

const GearCard = ({ item }: { item: FeaturedGearItem }) => {
  return (
    <Card className="overflow-hidden border-none shadow-md hover:-translate-y-1 hover:shadow-lg transition-transform h-full flex flex-col">
      <div className="relative h-52 bg-background">
        {item.is_new && (
          <Badge className="absolute top-2 right-2">New</Badge>
        )}
        <img
          src={item.image_url || '/placeholder.svg'}
          onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/placeholder.svg')}
          alt={item.name ?? ''}
          className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <CardContent className="p-5 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg line-clamp-2">{item.name}</h3>
          <p className="font-bold text-kitloop-text whitespace-nowrap ml-2">
            ${item.price}
            <span className="text-sm font-normal text-muted-foreground">/day</span>
          </p>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{item.provider}</p>
        <p className="text-muted-foreground text-xs">Camping • Prague</p>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1 text-sm font-medium">{item.rating}</span>
          <span className="text-sm text-muted-foreground ml-1">({item.reviews})</span>
        </div>
        <Button size="sm" variant="primary">
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
                <GearCard key={item.id} item={item} />
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
    </section>
  );
};

export default FeaturedGear;
