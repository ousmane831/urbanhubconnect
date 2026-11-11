import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { useSeo } from "../hooks/useSeo";
import { useSiteSettings } from "../hooks/useSiteSettings";

const SUBJECTS = [["membership", "Adhésion"], ["partnership", "Partenariat"], ["events", "Événements"], ["press", "Presse"],
  ["volunteer", "Bénévolat"], ["directory", "Annuaire"], ["map", "Cartographie"], ["other", "Autre"]].map(([value, label]) => ({ value, label }));
const FIELDS: FieldDef[] = [
  { name: "name", label: "Nom", type: "text", required: true }, { name: "organization", label: "Organisation", type: "text" },
  { name: "phone", label: "Téléphone", type: "tel" }, { name: "email", label: "E-mail", type: "email", required: true },
  { name: "subject", label: "Objet", type: "select", required: true, options: SUBJECTS, full: true },
  { name: "message", label: "Message", type: "textarea", required: true },
  { name: "consent", label: "J'accepte que mes données soient utilisées pour répondre à ma demande.", type: "consent" },
];

export default function Contact() {
  useSeo("Contact", "Contactez la Coordination d'Urban Hub Connect : adhésion, partenariat, événements, presse, bénévolat.");
  const s = useSiteSettings();
  const tel = s.phone.replace(/\s/g, "");
  const items = [
    { icon: MapPin, title: "Adresse", body: <address className="not-italic">{s.address}</address> },
    { icon: Phone, title: "Téléphone", body: <a className="link" href={`tel:${tel}`}>{s.phone}</a> },
    { icon: Mail, title: "E-mail", body: <a className="link break-all" href={`mailto:${s.email}`}>{s.email}</a> },
    { icon: Clock, title: "Horaires", body: "Lundi - Vendredi : 9h - 18h" },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Parlons de votre projet" intro="Une question ? Une suggestion ? Contactez la Coordination d'Urban Hub Connect.">
        <Button to={`tel:${tel}`} variant="light" size="lg"><Phone className="h-5 w-5" aria-hidden />Appeler la Coordination</Button>
        {s.whatsapp && <Button to={`https://wa.me/${s.whatsapp}`} variant="ghost" size="lg" target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" aria-hidden />WhatsApp</Button>}
      </PageHero>

      <Section tone="offwhite">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-12">
          <div className="space-y-4">
            <div>
              <p className="eyebrow mb-3">Coordination</p>
              <h2 className="text-3xl leading-tight">Coordination Urban Hub Connect</h2>
              <p className="mt-3 text-lg text-navy/70">Notre équipe est à votre disposition pour vous accompagner dans vos démarches.</p>
            </div>
            <ul className="card divide-y divide-navy/10">
              {items.map((i) => (
                <li key={i.title} className="flex items-start gap-4 p-5">
                  <span className="icon-tile"><i.icon className="h-5 w-5" aria-hidden /></span>
                  <div><h3 className="text-sm font-bold uppercase tracking-wider text-navy/55">{i.title}</h3><div className="mt-1 text-navy/85">{i.body}</div></div>
                </li>))}
            </ul>
            <Button to="/adherer" variant="secondary" className="w-full sm:w-auto">Devenir membre</Button>
          </div>

          <div className="card p-6 sm:p-9">
            <h2 className="text-2xl sm:text-3xl">Envoyer un message</h2>
            <p className="mb-7 mt-2 text-navy/70">Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.</p>
            <ConfigForm endpoint="/contact/" fields={FIELDS} submitLabel="Envoyer le message" successFallback="Merci. Votre message a bien été envoyé." />
          </div>
        </div>
      </Section>
    </>
  );
}
