import { Section } from "../components/ui/Container";
import { Async } from "../components/ui/Async";
import { PageHero } from "../components/ui/PageHero";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getPartners, getTiers } from "../services/api";
import { fmtFcfa } from "../utils/format";

export default function Partners() {
  useSeo("Partenaires", "Formules de partenariat avec Urban Hub Connect et demande de rappel.");
  const tiers = useAsync(getTiers);
  const partners = useAsync(getPartners);
  const fields: FieldDef[] = [
    { name: "company", label: "Entreprise ou institution", type: "text", required: true },
    { name: "tier", label: "Formule envisagée", type: "select", options: tiers.data?.map((t) => ({ value: t.slug, label: `${t.name} · ${fmtFcfa(t.amount_fcfa)}` })) },
    { name: "contact_name", label: "Nom du contact", type: "text", required: true }, { name: "role", label: "Fonction", type: "text" },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "message", label: "Message", type: "textarea" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ];
  return (
    <>
      <PageHero title="Partenaires" intro="Cinq formules pour soutenir le réseau et gagner en visibilité." />
      <Section>
        <Async state={tiers} empty="Les formules de partenariat seront publiées prochainement.">
          {(list) => (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <li key={t.slug} className="rounded-md border border-navy/15 p-6 shadow-soft">
                  <h2 className="text-xl">{t.name}</h2>
                  <p className="mt-2 font-heading text-2xl font-extrabold text-green">{fmtFcfa(t.amount_fcfa)}</p>
                  {t.benefits && <p className="mt-3 whitespace-pre-line text-navy/80">{t.benefits}</p>}
                </li>))}
            </ul>)}
        </Async>
      </Section>
      {!!partners.data?.length && (  /* bloc masqué tant qu'aucun partenaire n'est confirmé */
        <Section tone="offwhite"><h2 className="mb-8 text-2xl sm:text-3xl">Nos partenaires</h2>
          <ul className="flex flex-wrap items-center gap-8">{partners.data.map((p) => (
            <li key={p.name}>{p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer"><img src={p.logo} alt={p.name} loading="lazy" className="h-16 w-auto object-contain" /></a>
              : <img src={p.logo} alt={p.name} loading="lazy" className="h-16 w-auto object-contain" />}</li>))}</ul>
        </Section>)}
      <Section>
        <div className="max-w-3xl"><h2 className="mb-2 text-2xl sm:text-3xl">Être rappelé</h2>
          <p className="mb-6 text-navy/75">Laissez vos coordonnées : la Coordination vous recontacte.</p>
          <ConfigForm key={tiers.data?.length ?? 0} endpoint="/partnerships/" fields={fields} submitLabel="Demander à être rappelé" successFallback="Merci. La Coordination vous rappellera sous 72 heures." /></div>
      </Section>
    </>
  );
}
