import { ExternalLink, Lock } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Section } from "../components/ui/Container";
import { ErrorState, Loading } from "../components/ui/States";
import { OrganizationLogo } from "../features/directory/OrganizationCard";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getOrganization } from "../services/api";
import { POLE_LABELS } from "../utils/constants";
import { NotFound } from "./ErrorPage";

const MiniMap = lazy(() => import("../features/map/MiniMap"));

export default function OrganizationDetail() {
  const { slug = "" } = useParams();
  const { data: org, error, loading, notFound, retry } = useAsync(() => getOrganization(slug), [slug]);
  useSeo(org?.name ?? "Fiche organisation", org?.short_description || "Fiche d'un acteur du réseau Urban Hub Connect.");
  if (notFound) return <NotFound />;
  if (loading) return <Loading />;
  if (error || !org) return <Container className="py-16"><ErrorState message={error ?? "Fiche indisponible."} onRetry={retry} /></Container>;

  const links = [["Site web", org.website], ["LinkedIn", org.linkedin], ["Facebook", org.facebook], ["Instagram", org.instagram]].filter(([, u]) => u);
  return (
    <Section>
      <Link to="/annuaire" className="link">← Retour à l'annuaire</Link>
      <div className="mt-6 flex items-start gap-5">
        <OrganizationLogo org={org} size="h-24 w-24" />
        <div>
          <h1 className="text-3xl sm:text-4xl">{org.name}</h1>
          {org.member_founder && <p className="mt-1 font-semibold text-green">Membre fondateur</p>}
        </div>
      </div>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {org.description && <><h2 className="text-xl">Présentation</h2><p className="mt-3 max-w-prose whitespace-pre-line text-lg">{org.description}</p></>}
          {!!org.commissions.length && (
            <><h2 className="mt-10 text-xl">Commissions</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{org.commissions.map((c) => <li key={c.slug} className="rounded border border-navy/20 px-3 py-1.5">{c.name}</li>)}</ul></>
          )}
          <p className="mt-10 flex items-start gap-3 rounded-md bg-offwhite p-4 text-navy/80">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Les coordonnées directes, les offres et les besoins de cette organisation sont réservés aux membres connectés.
          </p>
        </div>
        <aside className="space-y-6">
          <dl className="space-y-3">
            {[["Collège", org.college.name], ["Secteur", org.sector.name], ["Pôle", POLE_LABELS[org.pole] ?? org.pole], ["Quartier", org.neighborhood], ["Adresse", org.address]]
              .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-sm text-navy/65">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
          </dl>
          {!!links.length && <ul className="space-y-2">{links.map(([label, url]) => (
            <li key={label}><a className="link inline-flex items-center gap-1.5" href={url} target="_blank" rel="noopener noreferrer">{label}<ExternalLink className="h-4 w-4" aria-hidden /><span className="sr-only"> (nouvel onglet)</span></a></li>))}</ul>}
          {org.latitude != null && org.longitude != null && (
            <Suspense fallback={<Loading label="Chargement de la carte…" />}><MiniMap lat={org.latitude} lng={org.longitude} name={org.name} /></Suspense>
          )}
        </aside>
      </div>
    </Section>
  );
}
