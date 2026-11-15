import { Car, Footprints, LocateFixed, Navigation, Route, X } from "lucide-react";
import type { RouteResult, TravelMode } from "../../services/api";
import type { MapPlace } from "../../types/api";
import { distanceKm, fmtDistance, fmtDuration, navigationLinks } from "../../utils/geo";

interface Props {
  place: MapPlace; mode: TravelMode; route: RouteResult | null; loading: boolean; error: string; locating: boolean;
  user: [number, number] | null; activeStep: number | null;
  onMode: (m: TravelMode) => void; onStep: (i: number) => void; onRecenter: () => void; onClose: () => void;
}

/** Itinéraire vers un lieu : durée, distance, étapes en français, et ouverture de Google Maps / Waze / Plans pour le guidage vocal. */
export function RoutePanel({ place, mode, route, loading, error, locating, user, activeStep, onMode, onStep, onRecenter, onClose }: Props) {
  const to: [number, number] = [place.latitude, place.longitude];
  const links = navigationLinks(to, mode);
  const modes: [TravelMode, string, typeof Car][] = [["driving", "Voiture", Car], ["foot", "À pied", Footprints]];
  const appBtn = "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold";

  return (
    <section aria-label={`Itinéraire vers ${place.name}`} className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-green/30 bg-white shadow-soft">
      <header className="border-b border-navy/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green"><Route className="h-4 w-4" aria-hidden />Itinéraire</p>
            <h3 className="mt-0.5 text-lg leading-snug">{place.name}</h3>
            {place.address && <p className="text-sm text-navy/65">{place.address}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-offwhite" aria-label="Fermer l'itinéraire"><X className="h-5 w-5" /></button>
        </div>

        <div role="group" aria-label="Mode de déplacement" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-offwhite p-1">
          {modes.map(([m, label, Icon]) => (
            <button key={m} onClick={() => onMode(m)} aria-pressed={mode === m}
              className={`flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-sm font-semibold ${mode === m ? "bg-white text-green shadow-sm" : "text-navy/70"}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>))}
        </div>

        <div className="mt-3 min-h-[3rem]" role="status" aria-live="polite">
          {locating ? <p className="text-navy/70">Recherche de votre position…</p>
            : loading ? <p className="text-navy/70">Calcul de l'itinéraire…</p>
            : route ? (
              <p><span className="font-heading text-2xl font-extrabold text-green">{fmtDuration(route.duration)}</span>
                <span className="ml-2 text-navy/70">{fmtDistance(route.distance)} {mode === "foot" ? "à pied" : "en voiture"}</span></p>)
            : error ? (
              <p className="text-sm text-navy/80">{error}
                {user && <span className="mt-1 block text-navy/60">À vol d'oiseau : environ {fmtDistance(distanceKm(user, to) * 1000)}.</span>}</p>)
            : null}
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold"><Navigation className="h-4 w-4 text-green" aria-hidden />Guidage vocal : ouvrir dans</p>
        <div className="mt-2 flex gap-2">
          <a href={links.google} target="_blank" rel="noopener noreferrer" className={`${appBtn} bg-green text-white hover:bg-green-2`}>Google Maps</a>
          <a href={links.waze} target="_blank" rel="noopener noreferrer" className={`${appBtn} border border-navy/20 hover:bg-offwhite`}>Waze</a>
          <a href={links.apple} target="_blank" rel="noopener noreferrer" className={`${appBtn} border border-navy/20 hover:bg-offwhite`}>Plans</a>
        </div>
        {user && (
          <button onClick={onRecenter} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:underline">
            <LocateFixed className="h-4 w-4" aria-hidden />Recentrer sur ma position</button>)}
      </header>

      {!!route?.steps.length && (
        <ol aria-label="Étapes" className="flex-1 divide-y divide-navy/10 overflow-y-auto">
          {route.steps.map((s, i) => (
            <li key={i}>
              <button onClick={() => onStep(i)} disabled={!s.location} aria-current={activeStep === i ? "step" : undefined}
                className={`flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-offwhite ${activeStep === i ? "bg-green/5" : ""}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activeStep === i ? "bg-green text-white" : "bg-offwhite text-navy/70"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-navy">{s.instruction}</span>
                  {s.distance > 0 && <span className="text-navy/55">{fmtDistance(s.distance)}</span>}
                </span>
              </button>
            </li>))}
        </ol>)}
      <p className="border-t border-navy/10 px-4 py-2 text-xs text-navy/50">
        Itinéraire indicatif (OpenStreetMap / OpenRouteService). Votre position sert uniquement au calcul et n'est pas enregistrée.
      </p>
    </section>
  );
}
