import L from "leaflet";
import { useEffect, useRef } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type { MapPlace } from "../../types/api";

export const DEFAULT_CENTER: [number, number] = [14.7, -17.2];
type LatLng = [number, number];

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

/** Recadrages de la carte, chacun déclenché par un changement précis (et non à chaque mise à jour de la position). */
function Viewport({ places, focus, user, path, recenter }: {
  places: MapPlace[]; focus: LatLng | null; user: LatLng | null; path: LatLng[] | null; recenter: number;
}) {
  const map = useMap();
  const hadUser = useRef(false);
  useEffect(() => {  // nouveau trajet : on montre tout le parcours
    if (path && path.length > 1) map.fitBounds(L.latLngBounds(path), { padding: [40, 40], maxZoom: 16 });
  }, [path, map]);
  useEffect(() => {  // première position connue (sans trajet) : on s'y rend une fois
    if (user && !hadUser.current && !path) map.flyTo(user, 14);
    hadUser.current = !!user;
  }, [user, path, map]);
  useEffect(() => { if (recenter && user) map.flyTo(user, 16); }, [recenter]);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focus) map.flyTo(focus, 16); }, [focus, map]);
  useEffect(() => {
    if (!path && !user && places.length) map.fitBounds(L.latLngBounds(places.map((p) => [p.latitude, p.longitude] as LatLng)), { padding: [40, 40], maxZoom: 15 });
  }, [places]);  // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface Props {
  places: MapPlace[]; selected: string | null; user: LatLng | null; accuracy?: number | null;
  /** Trajet par les routes ; à défaut (calcul impossible), ligne droite indicative. */
  path: LatLng[] | null; straight: [LatLng, LatLng] | null;
  focus: LatLng | null; recenter: number;
  onRoutePlace: (place: MapPlace) => void; className?: string;
}

export default function MapView({ places, selected, user, accuracy, path, straight, focus, recenter, onRoutePlace, className = "" }: Props) {
  const focusPlace = places.find((p) => p.slug === selected);
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom={false} className={`z-0 ${className}`} aria-label="Carte interactive du Hub">
      <TileLayer attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Viewport places={places} user={user} path={path} recenter={recenter}
        focus={focus ?? (focusPlace ? [focusPlace.latitude, focusPlace.longitude] : null)} />
      {path && path.length > 1 && <>
        <Polyline positions={path} pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.9 }} />
        <Polyline positions={path} pathOptions={{ color: "#1E5C3F", weight: 6, opacity: 0.95 }} />
      </>}
      {!path && straight && <Polyline positions={straight} pathOptions={{ color: "#1E5C3F", weight: 4, opacity: 0.7, dashArray: "10 8" }} />}
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
            <button type="button" onClick={() => onRoutePlace(p)} className="mt-2 min-h-10 rounded-md bg-green px-3 font-semibold text-white hover:bg-green-2">
              Voir l'itinéraire
            </button>
          </Popup>
        </Marker>
      ))}
      {user && <>
        {!!accuracy && accuracy < 2000 && <Circle center={user} radius={accuracy} pathOptions={{ color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.1 }} />}
        <CircleMarker center={user} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}><Popup>Vous êtes ici</Popup></CircleMarker>
      </>}
      {focus && <CircleMarker center={focus} radius={7} pathOptions={{ color: "#C39A3E", weight: 3, fillColor: "#ffffff", fillOpacity: 1 }} />}
    </MapContainer>
  );
}
