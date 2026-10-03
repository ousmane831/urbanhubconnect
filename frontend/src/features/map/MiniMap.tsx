import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const pin = L.divIcon({ className: "", html: '<span style="display:block;width:20px;height:20px;border-radius:50%;background:#1E5C3F;border:3px solid #fff;box-shadow:0 1px 4px rgba(14,34,64,.5)"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

export default function MiniMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} className="z-0 h-64 w-full rounded-md" aria-label={`Emplacement de ${name}`}>
      <TileLayer attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pin} title={name} />
    </MapContainer>
  );
}
