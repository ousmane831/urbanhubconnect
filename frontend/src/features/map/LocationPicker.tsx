import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER } from "./MapView";

const pin = L.divIcon({ className: "", html: '<span style="display:block;width:20px;height:20px;border-radius:50%;background:#C39A3E;border:3px solid #fff;box-shadow:0 1px 4px rgba(14,34,64,.5)"></span>', iconSize: [26, 26], iconAnchor: [13, 13] });

function Clicks({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Carte cliquable pour placer le lieu proposé. */
export default function LocationPicker({ value, onPick }: { value: [number, number] | null; onPick: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={value ?? DEFAULT_CENTER} zoom={value ? 16 : 11} scrollWheelZoom={false} className="z-0 h-72 w-full rounded-md border border-navy/20" aria-label="Carte pour placer le lieu">
      <TileLayer attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clicks onPick={onPick} />
      {value && <Marker position={value} icon={pin} />}
    </MapContainer>
  );
}
