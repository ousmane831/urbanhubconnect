import { LocateFixed, Map, Filter, Search, Route } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Section, SectionHeading } from "../components/ui/Container";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { PageHero } from "../components/ui/PageHero";
import ProposePlaceForm from "../features/map/ProposePlaceForm";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useSeo } from "../hooks/useSeo";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { RoutePanel } from "../features/map/RoutePanel";
import { getMapCategories, getRoute, listPlaces, type RouteResult, type TravelMode } from "../services/api";
import { apiErrorMessage } from "../utils/errors";
import type { MapPlace } from "../types/api";
import { POLE_LABELS } from "../utils/constants";
import { distanceKm } from "../utils/geo";

const MapView = lazy(() => import("../features/map/MapView"));

export default function MapPage() {
  useSeo("Cartographie du Hub – Diamniadio et Lac Rose",
    "La carte interactive des institutions, entreprises, écoles, services, équipements et initiatives des pôles urbains de Diamniadio et du Lac Rose.",
    undefined, true);  // titre exact, sans suffixe
  const { email } = useSiteSettings();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "", pole = params.get("pole") ?? "";
  const [text, setText] = useState("");
  const search = useDebounce(text);
  const [selected, setSelected] = useState<string | null>(null);
  const [user, setUser] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  // Itinéraire : lieu visé, mode, point de départ figé au moment de la demande (la position suivie en direct ne relance pas le calcul).
  const [routeTarget, setRouteTarget] = useState<string | null>(null);
  const [mode, setMode] = useState<TravelMode>("driving");
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [recenter, setRecenter] = useState(0);
  const watchId = useRef<number | null>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const categories = useAsync(getMapCategories);
  const { data, error, loading, retry } = useAsync(() => listPlaces({ category, pole, search }), [category, pole, search]);

  const set = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }); };
  const geoError = (err: GeolocationPositionError) => err.code === err.PERMISSION_DENIED
    ? "Localisation refusée. Autorisez-la dans les réglages du navigateur, ou utilisez Google Maps, Waze ou Plans."
    : "Votre position n'a pas pu être déterminée. Vérifiez que la localisation de l'appareil est activée, puis réessayez.";

  /** Suivi de la position en direct (point bleu qui avance), lancé uniquement après un clic. */
  const follow = useCallback(() => {
    if (watchId.current !== null || !("geolocation" in navigator)) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => { setUser([pos.coords.latitude, pos.coords.longitude]); setAccuracy(pos.coords.accuracy); },
      () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }, []);
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  /** Position actuelle (une fois), puis suivi en direct. */
  const position = (onOk: (p: [number, number]) => void, onFail: (msg: string) => void) => {
    if (!("geolocation" in navigator)) return onFail("La géolocalisation n'est pas disponible sur cet appareil.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUser(here); setAccuracy(pos.coords.accuracy); follow(); onOk(here);
      },
      (err) => onFail(geoError(err)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const locate = () => {
    setGeoMsg("Autorisez la localisation dans la fenêtre de votre navigateur…");
    position(() => setGeoMsg("Lieux triés du plus proche au plus éloigné. Votre position est suivie en direct sur la carte."), setGeoMsg);
  };

  const places = useMemo(() => {
    const list = data ?? [];
    return user ? [...list].sort((a, b) => distanceKm(user, [a.latitude, a.longitude]) - distanceKm(user, [b.latitude, b.longitude])) : list;
  }, [data, user]);
  const reset = () => { setText(""); setParams({}, { replace: true }); };

  const showRoute = (place: MapPlace) => {
    setSelected(place.slug); setRouteTarget(place.slug); setActiveStep(null); setRoute(null); setRouteError("");
    if (window.innerWidth < 1024) mapBox.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    if (user) { setOrigin(user); return; }
    setLocating(true);
    position((here) => { setLocating(false); setOrigin(here); }, (msg) => { setLocating(false); setRouteError(msg); });
  };
  const changeMode = (m: TravelMode) => { setMode(m); setActiveStep(null); if (user) setOrigin(user); };
  const closeRoute = () => { setRouteTarget(null); setRoute(null); setRouteError(""); setActiveStep(null); };

  const routePlace = (data ?? []).find((p) => p.slug === routeTarget);
  useEffect(() => {
    if (!routePlace || !origin) return;
    let live = true;
    setRouteLoading(true); setRouteError("");
    getRoute(origin, [routePlace.latitude, routePlace.longitude], mode)
      .then((r) => { if (live) setRoute(r); })
      .catch((e) => { if (live) { setRoute(null); setRouteError(apiErrorMessage(e)); } })
      .finally(() => { if (live) setRouteLoading(false); });
    return () => { live = false; };
  }, [routePlace?.slug, origin, mode]);  // eslint-disable-line react-hooks/exhaustive-deps

  const straight = useMemo<[[number, number], [number, number]] | null>(() => user && routePlace && !route
    ? [user, [routePlace.latitude, routePlace.longitude]] : null, [user, routePlace, route]);
  const stepFocus = activeStep !== null ? route?.steps[activeStep]?.location ?? null : null;

  return (
    <>
      <PageHero eyebrow="Les deux pôles sur une seule carte" title="Cartographie du Hub"
        intro="Où se trouvent les institutions, les zones d'activité, les écoles, les services, les équipements et les initiatives des deux pôles ? La Cartographie du Hub rassemble sur une seule carte ce qui fait vivre Diamniadio et le Lac Rose, pour mieux s'orienter, mieux se connaître et repérer les complémentarités du territoire." />

      <Section>
        <div className="card relative p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-green" />
            <h3 className="text-lg font-bold text-navy">Filtrer la carte</h3>
          </div>
          <form role="search" aria-label="Filtrer la carte" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label htmlFor="mq" className="mb-1.5 block font-semibold text-navy">Rechercher par nom</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" />
                <input id="mq" type="search" className="field pl-10" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nom du lieu…" />
              </div>
            </div>
            <div>
              <label htmlFor="mc" className="mb-1.5 block font-semibold text-navy">Couche</label>
              <select id="mc" className="field" value={category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Toutes</option>{categories.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
            </div>
            <div>
              <label htmlFor="mp" className="mb-1.5 block font-semibold text-navy">Pôle</label>
              <select id="mp" className="field" value={pole} onChange={(e) => set("pole", e.target.value)}>
                <option value="">Les deux</option>{Object.entries(POLE_LABELS).filter(([k]) => k !== "BOTH").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            <Button variant="primary" onClick={locate} className="w-full sm:w-auto"><LocateFixed className="h-5 w-5" aria-hidden />Autour de moi</Button>
          </form>
          <p role="status" className="mt-3 min-h-[1.5rem] text-sm text-navy/75">{geoMsg}</p>
        </div>
      </Section>

      <Section>
        {loading ? <Loading label="Chargement de la carte…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
          !places.length ? <EmptyState message="Aucun lieu ne correspond à ces critères." action={<Button variant="secondary" onClick={reset}>Réinitialiser</Button>} /> : (
            <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
              <div ref={mapBox} className="relative scroll-mt-20 overflow-hidden rounded-2xl border border-navy/10 shadow-soft">
                <Suspense fallback={<Loading label="Chargement de la carte…" />}>
                  <MapView places={places} selected={selected} user={user} accuracy={accuracy} path={route?.geometry ?? null} straight={straight}
                    focus={stepFocus} recenter={recenter} onRoutePlace={showRoute} className="h-[50vh] min-h-[300px] w-full sm:h-[60vh] lg:h-[70vh]" />
                </Suspense>
              </div>
              {routePlace ? (
                <RoutePanel place={routePlace} mode={mode} route={route} loading={routeLoading} error={routeError} locating={locating}
                  user={user} activeStep={activeStep} onMode={changeMode} onStep={setActiveStep}
                  onRecenter={() => { setActiveStep(null); setRecenter((n) => n + 1); }} onClose={closeRoute} />
              ) : (
              <section aria-label="Liste des lieux" className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-4 shadow-soft max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-navy">{places.length} lieu{places.length > 1 ? "x" : ""}</p>
                  {user && <span className="text-xs text-navy/60">Trié par distance</span>}
                </div>
                <ul className="divide-y divide-navy/10">
                  {places.map((p) => (
                    <li key={p.slug}>
                      <div className={`px-3 py-4 transition-colors hover:bg-offwhite ${selected === p.slug ? "border-l-4 border-l-green bg-offwhite" : ""}`}>
                        <button type="button" onClick={() => setSelected(p.slug)} aria-pressed={selected === p.slug} className="w-full text-left">
                          <span className="block font-semibold text-navy">{p.name}{p.is_member && <span className="ml-2 text-sm text-purple">Membre</span>}</span>
                          <span className="mt-1 block text-sm text-navy/70">{p.category.name}{user && ` · ${distanceKm(user, [p.latitude, p.longitude]).toFixed(1)} km`}</span>
                        </button>
                        <button type="button" onClick={() => showRoute(p)} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-green/30 px-3 text-sm font-semibold text-green transition-colors hover:bg-green/5">
                          <Route className="h-4 w-4" aria-hidden="true" />Voir l'itinéraire
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>)}
            </div>)}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-navy/80">
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-green" />Lieu</span>
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3 w-3 rotate-45 rounded-sm bg-purple" />Membre du réseau (fiche Annuaire)</span>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-navy/75">
          La Cartographie du Hub est enrichie progressivement par la Coordination et par les membres. Les informations sont données à titre indicatif ;
          signalez toute erreur à <a className="link" href={`mailto:${email}`}>{email}</a>.
        </p>
      </Section>

      {!!categories.data?.length && (
        <Section tone="offwhite">
          <SectionHeading title="Couches de la carte" intro="Explorez les différentes catégories de lieux." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.data.map((c) => (
              <li key={c.slug} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-5 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <button onClick={() => { set("category", category === c.slug ? "" : c.slug); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={category === c.slug}
                  className="w-full text-left">
                  <span className={`block text-lg font-semibold ${category === c.slug ? "text-green" : "text-navy"}`}>{c.name}</span>
                  {c.description && <span className="mt-2 block text-navy/75">{c.description}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-navy/80">Un clic sur un point ouvre sa fiche : nom, catégorie, adresse, horaires, contact et, pour un membre, le lien vers sa fiche Annuaire.</p>
        </Section>)}

      <Section id="proposer">
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-purple text-white">
            <Map className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-navy">Proposer un lieu</h2>
          <p className="mb-8 mt-3 max-w-3xl text-lg text-navy/75">
            Vous connaissez un lieu, un service ou une initiative qui manque sur la carte ? Proposez-le : la Coordination vérifie chaque information avant publication.
          </p>
          <ProposePlaceForm />
        </div>
      </Section>
    </>
  );
}
