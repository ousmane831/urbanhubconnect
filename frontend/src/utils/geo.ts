/** Distance à vol d'oiseau en km (formule de haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** « 450 m » ou « 12,4 km ». */
export const fmtDistance = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", ",")} km`);

/** « 6 min » ou « 1 h 05 ». */
export const fmtDuration = (s: number) => {
  const min = Math.max(1, Math.round(s / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
};

/** Liens d'ouverture des applications de navigation (guidage vocal), destination pré-remplie. */
export const navigationLinks = (to: [number, number], mode: "driving" | "foot") => {
  const ll = `${to[0]},${to[1]}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=${mode === "foot" ? "walking" : "driving"}`,
    waze: `https://waze.com/ul?ll=${ll}&navigate=yes`,
    apple: `https://maps.apple.com/?daddr=${ll}&dirflg=${mode === "foot" ? "w" : "d"}`,
  };
};
