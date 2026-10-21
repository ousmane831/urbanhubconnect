import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Star } from "lucide-react";
import type { OrganizationListItem } from "../../types/api";
import { POLE_LABELS } from "../../utils/constants";

export function OrganizationLogo({ org, size = "h-16 w-16" }: { org: Pick<OrganizationListItem, "name" | "logo">; size?: string }) {
  return org.logo
    ? <img src={org.logo} alt={`Logo de ${org.name}`} loading="lazy" className={`${size} shrink-0 rounded border border-navy/10 bg-white object-contain p-1`} />
    : <div aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded bg-navy font-heading text-xl font-bold text-white`}>{org.name.slice(0, 2).toUpperCase()}</div>;
}

export function OrganizationCard({ org }: { org: OrganizationListItem }) {
  return (
    <article className="group flex w-full flex-col rounded-2xl border border-navy/10 bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-green/40 hover:shadow-lg sm:p-6">
      <div className="flex items-start gap-4">
        <OrganizationLogo org={org} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug text-navy">{org.name}</h3>
          {org.member_founder && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-navy">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" />
              Membre fondateur
            </span>
          )}
        </div>
      </div>
      <dl className="mt-5 space-y-2 border-t border-navy/10 pt-4 text-sm text-navy/75">
        <div className="flex items-start gap-2"><dt className="sr-only">Collège</dt><dd className="font-medium">{org.college.name}</dd></div>
        <div className="flex items-start gap-2"><dt className="sr-only">Secteur</dt><dd>{org.sector.name}</dd></div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden="true" />
          <dt className="sr-only">Pôle</dt><dd>{POLE_LABELS[org.pole] ?? org.pole}</dd>
        </div>
      </dl>
      {org.short_description && <p className="mt-4 line-clamp-3 flex-1 leading-relaxed text-navy/75">{org.short_description}</p>}
      <Link to={`/annuaire/${org.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-between gap-2 border-t border-navy/10 pt-4 font-semibold text-green transition-colors group-hover:text-green-2" aria-label={`Voir la fiche de ${org.name}`}>
        Voir la fiche <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </article>
  );
}
