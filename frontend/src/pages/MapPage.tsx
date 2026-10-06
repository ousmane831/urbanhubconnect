import { LocateFixed } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container, Section } from "../components/ui/Container";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
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
      <Container className="pt-10">
        <h1 className="text-3xl sm:text-5xl">Cartographie du Hub</h1>
        <h2 className="mt-6 text-2xl sm:text-3xl">Les deux pôles sur une seule carte</h2>
        <p className="mt-3 max-w-3xl text-lg text-navy/80">
          Où se trouvent les institutions, les zones d'activité, les écoles, les services, les équipements et les initiatives des deux pôles ?
          La Cartographie du Hub rassemble sur une seule carte ce qui fait vivre Diamniadio et le Lac Rose, pour mieux s'orienter,
          mieux se connaître et repérer les complémentarités du territoire.
        </p>
        <form role="search" aria-label="Filtrer la carte" onSubmit={(e) => e.preventDefault()} className="mt-8 grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <div><label htmlFor="mq" className="mb-1.5 block font-semibold">Rechercher par nom</label>
            <input id="mq" type="search" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nom du lieu…" /></div>
          <div><label htmlFor="mc" className="mb-1.5 block font-semibold">Couche</label>
            <select id="mc" className="field" value={category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Toutes</option>{categories.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label htmlFor="mp" className="mb-1.5 block font-semibold">Pôle</label>
            <select id="mp" className="field" value={pole} onChange={(e) => set("pole", e.target.value)}>
              <option value="">Les deux</option>{Object.entries(POLE_LABELS).filter(([k]) => k !== "BOTH").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <Button variant="secondary" onClick={locate}><LocateFixed className="h-5 w-5" aria-hidden />Autour de moi</Button>
        </form>
        <p role="status" className="mt-3 min-h-[1.5rem] text-sm text-navy/75">{geoMsg}</p>
      </Container>

      <Container className="pb-8">
        {loading ? <Loading label="Chargement de la carte…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
          !places.length ? <EmptyState message="Aucun lieu ne correspond à ces critères." action={<Button variant="secondary" onClick={reset}>Réinitialiser</Button>} /> : (
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <Suspense fallback={<Loading label="Chargement de la carte…" />}>
                <MapView places={places} selected={selected} user={user} className="h-[55vh] min-h-[320px] w-full rounded-md border border-navy/15 lg:h-[70vh]" />
              </Suspense>
              <section aria-label="Liste des lieux" className="max-h-[70vh] overflow-y-auto">
                <p className="mb-3 font-semibold">{places.length} lieu{places.length > 1 ? "x" : ""}</p>
                <ul className="divide-y divide-navy/10 border-y border-navy/10">
                  {places.map((p) => (
                    <li key={p.slug}>
                      <button onClick={() => setSelected(p.slug)} aria-pressed={selected === p.slug} className={`w-full px-2 py-3 text-left hover:bg-offwhite ${selected === p.slug ? "bg-offwhite" : ""}`}>
                        <span className="block font-semibold">{p.name}{p.is_member && <span className="ml-2 text-sm text-purple">Membre</span>}</span>
                        <span className="block text-sm text-navy/70">{p.category.name}{user && ` · ${distanceKm(user, [p.latitude, p.longitude]).toFixed(1)} km`}</span>
                      </button>
                    </li>))}
                </ul>
              </section>
            </div>)}
        <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-navy/80">
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full bg-green" />Lieu</span>
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3 w-3 rotate-45 rounded-sm bg-purple" />Membre du réseau (fiche Annuaire)</span>
        </p>
        <p className="mt-6 max-w-3xl text-sm text-navy/75">
          La Cartographie du Hub est enrichie progressivement par la Coordination et par les membres. Les informations sont données à titre indicatif ;
          signalez toute erreur à <a className="link" href={`mailto:${email}`}>{email}</a>.
        </p>
      </Container>

      {!!categories.data?.length && (
        <Section tone="offwhite">
          <h2 className="mb-6 text-2xl sm:text-3xl">Couches de la carte</h2>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {categories.data.map((c) => (
              <li key={c.slug} className="border-t border-navy/15">
                <button onClick={() => { set("category", category === c.slug ? "" : c.slug); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={category === c.slug}
                  className="w-full py-4 text-left hover:bg-white">
                  <span className="block text-lg font-semibold">{c.name}</span>
                  {c.description && <span className="mt-1 block text-navy/75">{c.description}</span>}
                </button>
              </li>))}
          </ul>
          <p className="mt-6 max-w-3xl text-navy/80">Un clic sur un point ouvre sa fiche : nom, catégorie, adresse, horaires, contact et, pour un membre, le lien vers sa fiche Annuaire.</p>
        </Section>)}

      <Section id="proposer">
        <h2 className="text-2xl sm:text-3xl">Proposer un lieu</h2>
        <p className="mb-8 mt-3 max-w-3xl text-lg text-navy/80">
          Vous connaissez un lieu, un service ou une initiative qui manque sur la carte ? Proposez-le : la Coordination vérifie chaque information avant publication.
        </p>
        <ProposePlaceForm />
      </Section>
    </>
  );
}
