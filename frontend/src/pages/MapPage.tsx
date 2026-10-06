import { LocateFixed, Map, Filter, Search } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Section, SectionHeading } from "../components/ui/Container";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { HexPattern } from "../components/ui/HexPattern";
import ProposePlaceForm from "../features/map/ProposePlaceForm";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useSeo } from "../hooks/useSeo";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { getMapCategories, listPlaces } from "../services/api";
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
  const reset = () => { setText(""); setParams({}, { replace: true }); };

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
              <Map className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Cartographie du Hub</h1>
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl text-white/90">Les deux pôles sur une seule carte</h2>
          <p className="mt-4 max-w-3xl text-lg text-white/80">
            Où se trouvent les institutions, les zones d'activité, les écoles, les services, les équipements et les initiatives des deux pôles ?
            La Cartographie du Hub rassemble sur une seule carte ce qui fait vivre Diamniadio et le Lac Rose, pour mieux s'orienter,
            mieux se connaître et repérer les complémentarités du territoire.
          </p>
        </div>
      </section>

      <Section>
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green opacity-10" />
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
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <div className="relative overflow-hidden rounded-2xl border border-navy/10 shadow-soft">
                <Suspense fallback={<Loading label="Chargement de la carte…" />}>
                  <MapView places={places} selected={selected} user={user} className="h-[50vh] min-h-[300px] w-full sm:h-[60vh] lg:h-[70vh]" />
                </Suspense>
              </div>
              <section aria-label="Liste des lieux" className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-4 shadow-soft max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-navy">{places.length} lieu{places.length > 1 ? "x" : ""}</p>
                  {user && <span className="text-xs text-navy/60">Trié par distance</span>}
                </div>
                <ul className="divide-y divide-navy/10">
                  {places.map((p) => (
                    <li key={p.slug}>
                      <button onClick={() => setSelected(p.slug)} aria-pressed={selected === p.slug} className={`w-full px-3 py-4 text-left transition-colors hover:bg-offwhite ${selected === p.slug ? "bg-offwhite border-l-4 border-l-green" : ""}`}>
                        <span className="block font-semibold text-navy">{p.name}{p.is_member && <span className="ml-2 text-sm text-purple">Membre</span>}</span>
                        <span className="block text-sm text-navy/70 mt-1">{p.category.name}{user && ` · ${distanceKm(user, [p.latitude, p.longitude]).toFixed(1)} km`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
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
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10" />
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
