import { ArrowLeft, ExternalLink, Lock, Star } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { ErrorState, Loading } from "../components/ui/States";
import { OrganizationLogo, sectorLabel } from "../features/directory/OrganizationCard";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getOrganization, getOrganizationFilters } from "../services/api";
import { POLE_LABELS } from "../utils/constants";
import { NotFound } from "./ErrorPage";

const MiniMap = lazy(() => import("../features/map/MiniMap"));

export default function OrganizationDetail() {
  const { slug = "" } = useParams();
  const { data: org, error, loading, notFound, retry } = useAsync(() => getOrganization(slug), [slug]);
  const filters = useAsync(getOrganizationFilters);
  useSeo(org?.name ?? "Fiche organisation", org?.short_description || "Fiche d'un acteur du réseau Urban Hub Connect.");
  if (notFound) return <NotFound />;
  if (loading) return <Loading />;
  if (error || !org) return <Container className="py-16"><ErrorState message={error ?? "Fiche indisponible."} onRetry={retry} /></Container>;

  const links = [["Site web", org.website], ["LinkedIn", org.linkedin], ["Facebook", org.facebook], ["Instagram", org.instagram]].filter(([, u]) => u);
  const facts = [["Collège", org.college.name], ["Secteur", sectorLabel(org.sector, filters.data?.sectors)], ["Pôle", POLE_LABELS[org.pole] ?? org.pole], ["Quartier", org.neighborhood], ["Adresse", org.address]].filter(([, v]) => v);
  return (
    <div className="bg-offwhite">
      <div className="border-b border-navy/10 bg-white">
        <Container className="py-8 sm:py-12">
          <Link to="/annuaire" className="link inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" aria-hidden />Retour à l'annuaire</Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <OrganizationLogo org={org} size="h-20 w-20 sm:h-24 sm:w-24" />
            <div>
              <h1 className="text-3xl leading-tight sm:text-4xl">{org.name}</h1>
              <p className="mt-2 text-navy/65">{[org.college.name, POLE_LABELS[org.pole] ?? org.pole].filter(Boolean).join(" · ")}</p>
              {org.member_founder && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold"><Star className="h-4 w-4 fill-gold text-gold" aria-hidden />Membre fondateur</p>}
            </div>
          </div>
        </Container>
      </div>
      <Container className="grid gap-6 py-10 sm:py-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {org.description && (
            <section className="card p-6 sm:p-8"><h2 className="text-xl">Présentation</h2><p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-navy/80">{org.description}</p></section>)}
          {!!org.commissions.length && (
            <section className="card p-6 sm:p-8"><h2 className="text-xl">Commissions</h2>
              <ul className="mt-4 flex flex-wrap gap-2">{org.commissions.map((c) => <li key={c.slug} className="rounded-full bg-green/10 px-3 py-1.5 text-sm font-semibold text-green">{c.name}</li>)}</ul></section>)}
          <section className="flex flex-col gap-4 rounded-2xl border border-purple/20 bg-purple/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-navy/80"><Lock className="mt-0.5 h-5 w-5 shrink-0 text-purple" aria-hidden />
              Les coordonnées directes, les offres et les besoins de cette organisation sont réservés aux membres connectés.</p>
            <Button to="/espace-membres" variant="secondary" className="shrink-0">Espace membres</Button>
          </section>
        </div>
        <aside className="space-y-6">
          {!!facts.length && (
            <dl className="card divide-y divide-navy/10">
              {facts.map(([k, v]) => <div key={k} className="px-6 py-4"><dt className="text-xs font-bold uppercase tracking-wider text-navy/55">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>)}
            </dl>)}
          {!!links.length && (
            <ul className="card divide-y divide-navy/10">{links.map(([label, url]) => (
              <li key={label}><a className="flex min-h-[52px] items-center justify-between px-6 font-semibold text-green hover:bg-offwhite" href={url} target="_blank" rel="noopener noreferrer">
                {label}<ExternalLink className="h-4 w-4" aria-hidden /><span className="sr-only"> (nouvel onglet)</span></a></li>))}</ul>)}
          {org.latitude != null && org.longitude != null && (
            <div className="overflow-hidden rounded-2xl border border-navy/10">
              <Suspense fallback={<Loading label="Chargement de la carte…" />}><MiniMap lat={org.latitude} lng={org.longitude} name={org.name} /></Suspense>
            </div>)}
        </aside>
      </Container>
    </div>
  );
}
