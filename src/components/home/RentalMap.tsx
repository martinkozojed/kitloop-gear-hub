import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Configure default marker icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Extend provider type with coordinates
type Provider = Database["public"]["Tables"]["providers"]["Row"] & {
  latitude?: number | null;
  longitude?: number | null;
};

const RentalMap = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Style zoom controls
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .leaflet-control-zoom {
        border: none;
      }
      .leaflet-control-zoom-in, .leaflet-control-zoom-out {
        background: hsl(142 76% 36%);
        color: white;
        border: none;
        width: 1.75rem;
        height: 1.75rem;
        line-height: 1.75rem;
        border-radius: 0.375rem;
        box-shadow: var(--shadow-sm);
        font-size: 1rem;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          setPosition([50.0755, 14.4378]); // Prague fallback
        }
      );
    } else {
      setTimeout(() => setPosition([50.0755, 14.4378]), 0);
    }
  }, []);

  // Fetch provider data
  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase.from("providers").select("*");
      if (error) {
        console.error("Error loading providers", error.message);
      }
      setProviders((data as Provider[]) ?? []);
    };
    fetchProviders();
  }, []);

  if (!position) {
    return (
      <div className="bg-muted animate-pulse rounded-xl h-[400px] md:h-[500px] w-full" />
    );
  }

  return (
    <div className="rounded-xl shadow-lg bg-card border text-card-foreground overflow-hidden h-[400px] md:h-[500px] w-full">
      <MapContainer
        center={position}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {providers.map((p) =>
          p.latitude && p.longitude ? (
            <Marker key={p.id} position={[p.latitude, p.longitude] as [number, number]}>
              <Popup>
                <div className="p-2 text-sm">
                  <strong className="block text-base">{p.name}</strong>
                  <span className="text-muted-foreground">{p.location}</span>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
};

export default RentalMap;
