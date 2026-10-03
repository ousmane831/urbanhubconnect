import { Container, Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { HexPattern } from "../components/ui/HexPattern";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { useSeo } from "../hooks/useSeo";
import { Button } from "../components/ui/Button";
import { MapPin, Phone, Mail, Building2, Send, Clock } from "lucide-react";

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
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">Contact</h1>
          <p className="mt-5 max-w-2xl text-xl text-white/85">
            Une question ? Une suggestion ? Contactez la Coordination d'Urban Hub Connect.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-navy">Coordination Urban Hub Connect</h2>
            <p className="mt-4 text-lg text-navy/75">Notre équipe est à votre disposition pour vous accompagner dans vos démarches.</p>
            
            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Adresse</h3>
                  <address className="mt-1 not-italic text-navy/80">
                    {s.address.split(",").map((l, i) => (
                      <p key={i}>{l.trim()}</p>
                    ))}
                  </address>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple text-white">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Téléphone</h3>
                  <p className="mt-1 text-navy/80">
                    <a className="link" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold text-white">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">E-mail</h3>
                  <p className="mt-1 text-navy/80">
                    <a className="link" href={`mailto:${s.email}`}>{s.email}</a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Horaires</h3>
                  <p className="mt-1 text-navy/80">Lundi - Vendredi : 9h - 18h</p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Button to="/adherer" variant="primary" className="w-full sm:w-auto">Devenir membre</Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10" />
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-purple text-white">
              <Send className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-navy">Envoyer un message</h2>
            <p className="mt-3 text-lg text-navy/75">Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.</p>
            <div className="mt-8">
              <ConfigForm endpoint="/contact/" fields={FIELDS} submitLabel="Envoyer le message" successFallback="Merci. Votre message a bien été envoyé." />
            </div>
          </div>
        </div>
      </Section>

      <section className="relative overflow-hidden bg-navy py-16 text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold">Besoin d'une réponse rapide ?</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/85">
            Pour les demandes urgentes, n'hésitez pas à nous contacter par téléphone.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-white px-6 py-2.5 text-base font-semibold text-navy transition-colors hover:bg-offwhite">
              <Phone className="h-5 w-5" />
              Appeler maintenant
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
