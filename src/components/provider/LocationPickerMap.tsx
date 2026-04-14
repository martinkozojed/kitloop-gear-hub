import React, { useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

// Configure default marker icons properly compatible with bundlers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LocationPickerMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

function LocationMarker({ position, setPosition, disabled }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void, disabled?: boolean }) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMapEvents({
    click(e) {
      if (!disabled) {
        setPosition(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        if (!disabled) {
          const marker = markerRef.current;
          if (marker != null) {
            setPosition(marker.getLatLng());
          }
        }
      },
    }),
    [disabled, setPosition]
  );

  return position === null ? null : (
    <Marker
      draggable={!disabled}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

export function LocationPickerMap({ latitude, longitude, onChange, disabled }: LocationPickerMapProps) {  
  // Prag default
  const defaultPosition: L.LatLngTuple = [50.0755, 14.4378];
  const currentPos = latitude && longitude ? new L.LatLng(latitude, longitude) : null;

  const handleSetPosition = (latlng: L.LatLng) => {
    onChange(latlng.lat, latlng.lng);
  };

  const center = currentPos || defaultPosition;

  const handleGetCurrentLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange(pos.coords.latitude, pos.coords.longitude);
          toast.success('Poloha úspěšně zaměřena');
        },
        (err) => {
          console.error('Geolocation error:', err);
          toast.error('Nepodařilo se získat polohu. Prosím vyberte bod na mapě ručně.');
        }
      );
    } else {
      toast.error('Váš prohlížeč nepodporuje geolokaci.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl overflow-hidden border border-border h-[300px] w-full relative z-0">
        <MapContainer center={center} zoom={currentPos ? 15 : 6} className="h-full w-full" scrollWheelZoom={true}>
          <TileLayer
             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
             url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker position={currentPos} setPosition={handleSetPosition} disabled={disabled} />
        </MapContainer>
      </div>
      {!disabled && (
        <div className="flex items-center gap-2 mt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full md:w-auto"
            onClick={handleGetCurrentLocation}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Získat mou aktuální polohu
          </Button>
          <span className="text-xs text-muted-foreground ml-2">Můžete také kliknout na mapu pro přesné posunutí špendlíku.</span>
        </div>
      )}
    </div>
  );
}
