import { useEffect } from "react";

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://www.urbanhubconnect.com";
const DEFAULT_DESC = "Urban Hub Connect, le réseau des acteurs des pôles urbains de Diamniadio et du Lac Rose.";

function upsert(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}
const meta = (key: "name" | "property", name: string, content: string) =>
  upsert(`meta[${key}="${name}"]`, () => { const m = document.createElement("meta"); m.setAttribute(key, name); return m; }, "content", content);

/** Title, description, canonical, Open Graph et Twitter Card pour chaque page. */
/** `image` : image de partage (idéalement 1200 × 630) ; sans image, la balise og:image est retirée. */
export function useSeo(title: string, description: string = DEFAULT_DESC, path?: string, exact = false, image?: string | null) {
  useEffect(() => {
    const full = exact || title === "Urban Hub Connect" ? title : `${title} · Urban Hub Connect`;
    const url = SITE + (path ?? window.location.pathname);
    document.title = full;
    meta("name", "description", description);
    upsert('link[rel="canonical"]', () => { const l = document.createElement("link"); l.rel = "canonical"; return l; }, "href", url);
    meta("property", "og:title", full); meta("property", "og:description", description);
    meta("property", "og:url", url); meta("property", "og:type", "website"); meta("property", "og:locale", "fr_FR");
    meta("name", "twitter:card", "summary_large_image"); meta("name", "twitter:title", full);
    meta("name", "twitter:description", description);
    if (image) {
      const abs = new URL(image, SITE).href;
      meta("property", "og:image", abs); meta("property", "og:image:width", "1200"); meta("property", "og:image:height", "630");
      meta("name", "twitter:image", abs);
    }
    return () => { if (image) document.head.querySelectorAll('meta[property^="og:image"], meta[name="twitter:image"]').forEach((m) => m.remove()); };
  }, [title, description, path, exact, image]);
}
