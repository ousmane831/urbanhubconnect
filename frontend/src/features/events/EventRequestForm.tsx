import { useMemo } from "react";
import { ConfigForm, type FieldDef } from "../../components/forms/ConfigForm";

export type RequestKind = "registration" | "host_afterwork" | "caravan" | "challenge";

const WAIVER = "J'accepte la décharge de responsabilité pour le reboisement.";
/** Mêmes clés que EventRequest.REGISTRATION_OPTIONS côté serveur. */
export const REGISTRATION_OPTIONS = [
  { value: "vendredi-matin", label: "Vendredi matin : ouverture officielle et Forum du Pôle, panel 1" },
  { value: "business-connect-vendredi", label: "Business Connect, vendredi" },
  { value: "business-connect-samedi", label: "Business Connect, samedi" },
  { value: "reboisement", label: "Vendredi après-midi : grand reboisement du Lac Rose, avec place dans le convoi de navettes" },
  { value: "samedi-forum", label: "Samedi : Forum du Pôle, panels 2, 3 et 4" },
  { value: "samedi-awards", label: "Samedi : cérémonie des Awards du Pôle" },
  { value: "navette-vendredi", label: "Navette depuis Dakar, vendredi" },
  { value: "navette-samedi", label: "Navette depuis Dakar, samedi" },
];

const CONFIG: Record<RequestKind, { message: string; submit: string }> = {
  registration: { message: "Précisions", submit: "M'inscrire" },
  host_afterwork: { message: "Thème envisagé, pôle et date souhaitée", submit: "Proposer d'accueillir" },
  caravan: { message: "Précisions (nombre de planteurs, organisation…)", submit: "M'inscrire au reboisement" },
  challenge: { message: "Défi concerné et solution que vous proposez", submit: "Envoyer ma solution" },
};

export function EventRequestForm({ kind }: { kind: RequestKind }) {
  const fields = useMemo<FieldDef[]>(() => [
    { name: "name", label: "Nom", type: "text", required: true },
    { name: "organization", label: "Organisation", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true },
    { name: "phone", label: "Téléphone", type: "tel" },
    ...(kind === "registration" ? [
      { name: "options", label: "Je participe à", type: "multi" as const, required: true, options: REGISTRATION_OPTIONS },
      { name: "what_offers", label: "Business Connect : ce que je propose", type: "textarea" as const },
      { name: "what_needs", label: "Business Connect : ce que je recherche", type: "textarea" as const },
      { name: "accept_waiver", label: WAIVER, type: "check" as const, hint: "Obligatoire si vous participez au reboisement." },
    ] : []),
    { name: "message", label: CONFIG[kind].message, type: "textarea" },
    ...(kind === "caravan" ? [{ name: "accept_waiver", label: WAIVER, type: "consent" as const }] : []),
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ], [kind]);
  return <ConfigForm endpoint="/event-requests/" extra={{ kind }} fields={fields} submitLabel={CONFIG[kind].submit} successFallback="Merci. Votre demande a bien été transmise." />;
}
