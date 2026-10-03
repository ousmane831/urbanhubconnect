import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type { MapPlace } from "../../types/api";

export const DEFAULT_CENTER: [number, number] = [14.7, -17.2];

// Icônes en divIcon : évite les images par défaut de Leaflet, cassées par les bundlers.
const icon = (active: boolean) => L.divIcon({
  className: "",
  html: `<span style="display:block;width:${active ? 22 : 16}px;height:${active ? 22 : 16}px;border-radius:50%;background:${active ? "#C39A3E" : "#1E5C3F"};border:3px solid #fff;box-shadow:0 1px 4px rgba(14,34,64,.5)"></span>`,
  iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -10],
});

function Viewport({ places, focus, user }: { places: MapPlace[]; focus: [number, number] | null; user: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (user) { map.flyTo(user, 14); return; }
    if (focus) { map.flyTo(focus, 16); return; }
    if (places.length) map.fitBounds(L.latLngBounds(places.map((p) => [p.latitude, p.longitude] as [number, number])), { padding: [40, 40], maxZoom: 15 });
  }, [places, focus, user, map]);
  return null;
}

interface Props { places: MapPlace[]; selected: string | null; user: [number, number] | null; className?: string }

export default function MapView({ places, selected, user, className = "" }: Props) {
  const focusPlace = places.find((p) => p.slug === selected);
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom={false} className={`z-0 ${className}`} aria-label="Carte interactive du Hub">
      <TileLayer attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Viewport places={places} focus={focusPlace ? [focusPlace.latitude, focusPlace.longitude] : null} user={user} />
      {places.map((p) => (
        <Marker key={p.slug} position={[p.latitude, p.longitude]} icon={icon(p.slug === selected)} title={p.name}>
          <Popup>
            <strong className="block text-base">{p.name}</strong>
            <span className="block">{p.category.name}</span>
            {p.address && <span className="block">{p.address}</span>}
            {p.opening_hours && <span className="block">{p.opening_hours}</span>}
            {p.organization && <Link to={`/annuaire/${p.organization.slug}`} className="link">Voir la fiche membre</Link>}
          </Popup>
        </Marker>
      ))}
      {user && <CircleMarker center={user} radius={9} pathOptions={{ color: "#4E2A84", fillColor: "#4E2A84", fillOpacity: 0.8 }}><Popup>Vous êtes ici</Popup></CircleMarker>}
    </MapContainer>
  );
}
