import { Link } from "react-router-dom";
import type { OrganizationListItem } from "../../types/api";
import { POLE_LABELS } from "../../utils/constants";

export function OrganizationLogo({ org, size = "h-16 w-16" }: { org: Pick<OrganizationListItem, "name" | "logo">; size?: string }) {
  return org.logo
    ? <img src={org.logo} alt={`Logo de ${org.name}`} loading="lazy" className={`${size} shrink-0 rounded border border-navy/10 bg-white object-contain p-1`} />
    : <div aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded bg-navy font-heading text-xl font-bold text-white`}>{org.name.slice(0, 2).toUpperCase()}</div>;
}

export function OrganizationCard({ org }: { org: OrganizationListItem }) {
  return (
    <article className="flex flex-col rounded-md border border-navy/15 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-4">
        <OrganizationLogo org={org} />
        <div className="min-w-0">
          <h3 className="text-lg leading-snug">{org.name}</h3>
          {org.member_founder && <p className="mt-1 text-sm font-semibold text-green">Membre fondateur</p>}
        </div>
      </div>
      <dl className="mt-4 space-y-1 text-sm text-navy/80">
        <div><dt className="sr-only">Collège</dt><dd>{org.college.name}</dd></div>
        <div><dt className="sr-only">Secteur</dt><dd>{org.sector.name}</dd></div>
        <div><dt className="sr-only">Pôle</dt><dd>{POLE_LABELS[org.pole] ?? org.pole}</dd></div>
      </dl>
      {org.short_description && <p className="mt-3 line-clamp-3 flex-1">{org.short_description}</p>}
      <Link to={`/annuaire/${org.slug}`} className="link mt-4 font-semibold" aria-label={`Voir la fiche de ${org.name}`}>Voir la fiche</Link>
    </article>
  );
}
