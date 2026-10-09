import { Section, SectionHeading } from "../components/ui/Container";
import { Async } from "../components/ui/Async";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { HexPattern } from "../components/ui/HexPattern";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getPartners, getTiers } from "../services/api";
import { fmtFcfa } from "../utils/format";
import { Handshake, Award, Phone, CheckCircle } from "lucide-react";

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
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
              <Handshake className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Partenaires</h1>
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl text-white/90">Cinq formules pour soutenir le réseau et gagner en visibilité</h2>
          <p className="mt-4 max-w-3xl text-lg text-white/80">
            Devenez partenaire d'Urban Hub Connect et soutenez le développement des pôles de Diamniadio et du Lac Rose.
          </p>
        </div>
      </section>

      <Section>
        <SectionHeading title="Formules de partenariat" intro="Choisissez la formule adaptée à votre engagement." />
        <Async state={tiers} empty="Les formules de partenariat seront publiées prochainement.">
          {(list) => (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t, index) => (
                <li key={t.slug} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:border-green hover:shadow-lg">
                  <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${
                    index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"
                  } opacity-10 transition-opacity group-hover:opacity-20`} />
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${
                    index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"
                  } text-white`}>
                    <Award className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-navy">{t.name}</h2>
                  <p className="mt-2 text-3xl font-extrabold text-green">{fmtFcfa(t.amount_fcfa)}</p>
                  <p className="text-sm text-navy/60">/ an</p>
                  {t.benefits && <p className="mt-4 whitespace-pre-line text-navy/75">{t.benefits}</p>}
                </li>))}
            </ul>)}
        </Async>
      </Section>

      {!!partners.data?.length && (
        <Section tone="offwhite">
          <SectionHeading title="Nos partenaires" intro="Ils nous font confiance et soutiennent le réseau." />
          <ul className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {partners.data.map((p) => (
              <li key={p.name} className="relative overflow-hidden rounded-xl border border-navy/10 bg-white p-4 shadow-soft transition-all hover:border-green hover:shadow-lg">
                {p.website ? (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={p.logo} alt={p.name} loading="lazy" className="h-12 sm:h-16 w-auto object-contain" />
                  </a>
                ) : (
                  <img src={p.logo} alt={p.name} loading="lazy" className="h-12 sm:h-16 w-auto object-contain" />
                )}
              </li>
            ))}
          </ul>
        </Section>)}

      <Section>
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-soft max-w-4xl mx-auto">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10" />
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-purple text-white">
            <Phone className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-navy">Être rappelé</h2>
          <p className="mt-3 text-lg text-navy/75">Laissez vos coordonnées : la Coordination vous recontacte sous 72 heures.</p>
          <div className="mt-8">
            <ConfigForm key={tiers.data?.length ?? 0} endpoint="/partnerships/" fields={fields} submitLabel="Demander à être rappelé" successFallback="Merci. La Coordination vous rappellera sous 72 heures." />
          </div>
        </div>
      </Section>

      <section className="relative overflow-hidden bg-navy py-12 text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">Pourquoi devenir partenaire ?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Visibilité", description: "Gagnez en visibilité auprès des acteurs du territoire" },
              { title: "Réseau", description: "Accédez à un réseau d'entreprises et d'institutions" },
              { title: "Impact", description: "Contribuez au développement économique local" },
              { title: "Innovation", description: "Participez aux initiatives innovantes du réseau" },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-green mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/80">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
