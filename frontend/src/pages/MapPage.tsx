import { LocateFixed } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useSeo } from "../hooks/useSeo";
import { getMapCategories, listPlaces } from "../services/api";
import { POLE_LABELS } from "../utils/constants";
import { distanceKm } from "../utils/geo";

const MapView = lazy(() => import("../features/map/MapView"));

export default function MapPage() {
  useSeo("Cartographie du Hub", "Localisez institutions, entreprises, équipements et services des pôles urbains de Diamniadio et du Lac Rose.");
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "", pole = params.get("pole") ?? "";
  const [text, setText] = useState(params.get("search") ?? "");
  const search = useDebounce(text);
  const [selected, setSelected] = useState<string | null>(null);
  const [user, setUser] = useState<[number, number] | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const categories = useAsync(getMapCategories);
  const { data, error, loading, retry } = useAsync(() => listPlaces({ category, pole, search }), [category, pole, search]);

  const set = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }); };
  const locate = () => {
    if (!("geolocation" in navigator)) return setGeoMsg("La géolocalisation n'est pas disponible sur cet appareil.");
    setGeoMsg("Autorisez la localisation dans la fenêtre de votre navigateur…");
    // L'autorisation est demandée par le navigateur uniquement après ce clic explicite.
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUser([pos.coords.latitude, pos.coords.longitude]); setGeoMsg("Lieux triés du plus proche au plus éloigné."); },
      (err) => setGeoMsg(err.code === err.PERMISSION_DENIED ? "Localisation refusée. Vous pouvez continuer à explorer la carte librement." : "Votre position n'a pas pu être déterminée."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };
  const places = useMemo(() => {
    const list = data ?? [];
    return user ? [...list].sort((a, b) => distanceKm(user, [a.latitude, a.longitude]) - distanceKm(user, [b.latitude, b.longitude])) : list;
  }, [data, user]);

  return (
    <>
      <Container className="py-8">
        <h1 className="text-3xl sm:text-5xl">Cartographie du Hub</h1>
        <form role="search" aria-label="Filtrer la carte" onSubmit={(e) => e.preventDefault()} className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <div><label htmlFor="mq" className="mb-1.5 block font-semibold">Rechercher un lieu</label>
            <input id="mq" type="search" className="field" value={text} onChange={(e) => { setText(e.target.value); }} onBlur={() => set("search", search)} placeholder="Nom, adresse…" /></div>
          <div><label htmlFor="mc" className="mb-1.5 block font-semibold">Catégorie</label>
            <select id="mc" className="field" value={category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Toutes</option>{categories.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label htmlFor="mp" className="mb-1.5 block font-semibold">Pôle</label>
            <select id="mp" className="field" value={pole} onChange={(e) => set("pole", e.target.value)}>
              <option value="">Les deux</option>{Object.entries(POLE_LABELS).filter(([k]) => k !== "BOTH").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <Button variant="secondary" onClick={locate}><LocateFixed className="h-5 w-5" aria-hidden />Autour de moi</Button>
        </form>
        <p role="status" className="mt-3 min-h-[1.5rem] text-sm text-navy/75">{geoMsg}</p>
      </Container>

      <Container className="pb-16">
        {loading ? <Loading label="Chargement de la carte…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
          !places.length ? <EmptyState message="Aucun lieu ne correspond à ces critères." action={<Button variant="secondary" onClick={() => { setText(""); setParams({}, { replace: true }); }}>Réinitialiser</Button>} /> : (
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <Suspense fallback={<Loading label="Chargement de la carte…" />}>
                <MapView places={places} selected={selected} user={user} className="h-[55vh] min-h-[320px] w-full rounded-md border border-navy/15 lg:h-[70vh]" />
              </Suspense>
              <section aria-label="Liste des lieux" className="max-h-[70vh] overflow-y-auto lg:order-last">
                <p className="mb-3 font-semibold">{places.length} lieu{places.length > 1 ? "x" : ""}</p>
                <ul className="divide-y divide-navy/10 border-y border-navy/10">
                  {places.map((p) => (
                    <li key={p.slug}>
                      <button onClick={() => setSelected(p.slug)} aria-pressed={selected === p.slug} className={`w-full px-2 py-3 text-left hover:bg-offwhite ${selected === p.slug ? "bg-offwhite" : ""}`}>
                        <span className="block font-semibold">{p.name}</span>
                        <span className="block text-sm text-navy/70">{p.category.name}{user && ` · ${distanceKm(user, [p.latitude, p.longitude]).toFixed(1)} km`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
      </Container>
    </>
  );
}
