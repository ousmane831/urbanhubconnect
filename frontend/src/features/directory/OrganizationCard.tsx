import { ArrowRight, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { OrganizationListItem } from "../../types/api";
import { POLE_LABELS } from "../../utils/constants";

/** Le secteur arrive en texte (identifiant ou libellé) : on affiche le libellé connu, sinon le texte reçu. */
export function sectorLabel(sector: unknown, sectors?: { slug: string; name: string }[]) {
  const raw = typeof sector === "string" ? sector : (sector as { name?: string } | null)?.name ?? "";
  return sectors?.find((x) => x.slug === raw)?.name ?? raw;
}

export function OrganizationLogo({ org, size = "h-16 w-16" }: { org: Pick<OrganizationListItem, "name" | "logo">; size?: string }) {
  return org.logo
    ? <img src={org.logo} alt={`Logo de ${org.name}`} loading="lazy" className={`${size} shrink-0 rounded-xl border border-navy/10 bg-white object-contain p-1.5`} />
    : <div aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-navy font-heading text-xl font-bold text-white`}>{org.name.slice(0, 2).toUpperCase()}</div>;
}

export function OrganizationCard({ org, sectors }: { org: OrganizationListItem; sectors?: { slug: string; name: string }[] }) {
  return (
    <article className="group card card-hover relative flex w-full flex-col p-6">
      <div className="flex items-start gap-4">
        <OrganizationLogo org={org} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug">
            <Link to={`/annuaire/${org.slug}`} className="after:absolute after:inset-0 after:rounded-2xl" aria-label={`Voir la fiche de ${org.name}`}>{org.name}</Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-green"><MapPin className="h-3.5 w-3.5" aria-hidden />{POLE_LABELS[org.pole] ?? org.pole}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-navy/60">{[org.college.name, sectorLabel(org.sector, sectors)].filter(Boolean).join(" · ")}</p>
      {org.short_description && <p className="mt-2 line-clamp-3 flex-1 leading-relaxed text-navy/75">{org.short_description}</p>}
      <div className="mt-5 flex items-center justify-between border-t border-navy/10 pt-4">
        {org.member_founder
          ? <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold"><Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />Membre fondateur</span>
          : <span />}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-green">Voir la fiche<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
      </div>
    </article>
  );
}
