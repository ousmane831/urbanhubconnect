import { useMemo } from "react";
import { ConfigForm, type FieldDef } from "../../components/forms/ConfigForm";

export type RequestKind = "host_afterwork" | "book_visit" | "open_doors" | "caravan" | "challenge";

const CONFIG: Record<RequestKind, { message: string; submit: string }> = {
  host_afterwork: { message: "Thème envisagé, pôle et date souhaitée", submit: "Proposer d'accueillir" },
  book_visit: { message: "Nombre de personnes et précisions", submit: "Réserver ma visite" },
  open_doors: { message: "Présentez votre organisation et ce que vous proposez pour la visite", submit: "Envoyer ma proposition" },
  caravan: { message: "Précisions (nombre de participants, entreprise…)", submit: "M'inscrire" },
  challenge: { message: "Défi concerné et solution que vous proposez", submit: "Envoyer ma solution" },
};

export function EventRequestForm({ kind }: { kind: RequestKind }) {
  const fields = useMemo<FieldDef[]>(() => [
    { name: "name", label: "Nom", type: "text", required: true },
    { name: "organization", label: "Organisation", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true },
    { name: "phone", label: "Téléphone", type: "tel" },
    ...(kind === "book_visit" ? [{ name: "circuit", label: "Circuit", type: "select" as const, required: true, full: true,
      options: [{ value: "A", label: "Circuit A « Cap sur le Lac Rose »" }, { value: "B", label: "Circuit B « Cap sur Diamniadio »" }] }] : []),
    { name: "message", label: CONFIG[kind].message, type: "textarea" },
    ...(kind === "caravan" ? [{ name: "accept_waiver", label: "Je m'engage à signer la décharge de responsabilité à l'inscription.", type: "consent" as const }] : []),
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ], [kind]);
  return <ConfigForm endpoint="/event-requests/" extra={{ kind }} fields={fields} submitLabel={CONFIG[kind].submit} successFallback="Merci. Votre demande a bien été transmise." />;
}
