import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type { MapPlace } from "../../types/api";

export const DEFAULT_CENTER: [number, number] = [14.7, -17.2];

// divIcon : évite les images par défaut de Leaflet (cassées par les bundlers).
// Lieu ordinaire = rond vert ; membre du réseau = losange violet ; sélection = or.
const icon = (active: boolean, member: boolean) => {
  const size = active ? 24 : 18, color = active ? "#C39A3E" : member ? "#4E2A84" : "#1E5C3F";
  const shape = member ? "border-radius:3px;transform:rotate(45deg)" : "border-radius:50%";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;${shape};background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(14,34,64,.5)"></span>`,
    iconSize: [size + 6, size + 6], iconAnchor: [(size + 6) / 2, (size + 6) / 2], popupAnchor: [0, -12],
  });
};

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
        <Marker key={p.slug} position={[p.latitude, p.longitude]} icon={icon(p.slug === selected, p.is_member)} title={p.name}>
          <Popup>
            <strong className="block text-base">{p.name}</strong>
            <span className="block">{p.category.name}{p.is_member && " · Membre du réseau"}</span>
            {p.address && <span className="block">{p.address}</span>}
            {p.opening_hours && <span className="block">Horaires : {p.opening_hours}</span>}
            {p.phone && <a className="link block" href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
            {p.email && <a className="link block" href={`mailto:${p.email}`}>{p.email}</a>}
            {p.website && <a className="link block" href={p.website} target="_blank" rel="noopener noreferrer">Site web<span className="sr-only"> (nouvel onglet)</span></a>}
            {p.organization && <Link to={`/annuaire/${p.organization.slug}`} className="link mt-1 block font-semibold">Voir la fiche Annuaire</Link>}
          </Popup>
        </Marker>
      ))}
      {user && <CircleMarker center={user} radius={9} pathOptions={{ color: "#0E2240", fillColor: "#0E2240", fillOpacity: 0.8 }}><Popup>Vous êtes ici</Popup></CircleMarker>}
    </MapContainer>
  );
}
