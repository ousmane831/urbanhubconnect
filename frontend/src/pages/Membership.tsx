import { Container, Section } from "../components/ui/Container";
import { Async } from "../components/ui/Async";
import { PageHero } from "../components/ui/PageHero";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getMembershipCategories, getOrganizationFilters } from "../services/api";
import { fmtFcfa } from "../utils/format";

export default function Membership() {
  useSeo("Adhérer au réseau", "Catégories et cotisations d'adhésion à Urban Hub Connect, et formulaire de demande d'adhésion.");
  const cats = useAsync(getMembershipCategories);
  const filters = useAsync(getOrganizationFilters);
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
  const fields: FieldDef[] = [
    { name: "organization_or_name", label: "Organisation ou nom", type: "text", required: true },
    { name: "category", label: "Catégorie d'adhésion", type: "select", required: true, options: opt(cats.data) },
    { name: "college", label: "Collège", type: "select", options: opt(filters.data?.colleges) },
    { name: "sector", label: "Secteur", type: "select", options: opt(filters.data?.sectors) },
    { name: "pole", label: "Pôle", type: "select", options: filters.data?.poles.map((p) => ({ value: p.value, label: p.label })) },
    { name: "representative", label: "Représentant", type: "text", required: true }, { name: "role", label: "Fonction", type: "text" },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "commissions", label: "Commissions qui vous intéressent", type: "multi", options: opt(filters.data?.commissions) },
    { name: "offers", label: "Ce que vous proposez", type: "textarea" }, { name: "needs", label: "Ce que vous recherchez", type: "textarea" },
    { name: "accept_charter", label: "J'accepte la charte du réseau.", type: "consent" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ];
  return (
    <>
      <PageHero title="Adhérer au réseau" intro="Choisissez la catégorie qui correspond à votre structure." />
      <Section>
        <Async state={cats} empty="Les catégories d'adhésion seront publiées prochainement.">
          {(list) => (
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {list.map((c) => (
                <li key={c.slug} className="flex items-baseline justify-between gap-6 border-t border-navy/15 py-5">
                  <span className="text-lg font-semibold">{c.name}</span>
                  <span className="whitespace-nowrap font-heading text-xl font-bold text-green">{fmtFcfa(c.amount_fcfa)}</span>
                </li>))}
            </ul>)}
        </Async>
      </Section>
      <Section tone="offwhite">
        <Container className="max-w-3xl !px-0"><h2 className="mb-6 text-2xl sm:text-3xl">Demande d'adhésion</h2>
          <ConfigForm key={`${cats.data?.length}-${filters.data ? 1 : 0}`} endpoint="/memberships/" fields={fields} submitLabel="Envoyer ma demande"
            successFallback="Merci. Votre demande a bien été transmise. La Coordination vous contactera sous 72 heures." />
        </Container>
      </Section>
    </>
  );
}
