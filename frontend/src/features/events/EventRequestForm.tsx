import { useMemo } from "react";
import { ConfigForm, type FieldDef } from "../../components/forms/ConfigForm";

export type RequestKind = "registration" | "host_afterwork" | "challenge";

/** Mêmes clés que EventRequest.REGISTRATION_OPTIONS côté serveur : jours prévus, facultatifs (le badge vaut pour les deux). */
export const REGISTRATION_OPTIONS = [
  { value: "vendredi", label: "Vendredi 11 décembre" },
  { value: "samedi", label: "Samedi 12 décembre" },
];

const CONFIG: Record<RequestKind, { message: string; submit: string }> = {
  registration: { message: "Précisions (facultatif)", submit: "M'inscrire aux deux journées" },
  host_afterwork: { message: "Thème envisagé, pôle et date souhaitée", submit: "Proposer d'accueillir" },
  challenge: { message: "Défi concerné et solution que vous proposez", submit: "Envoyer ma solution" },
};

export function EventRequestForm({ kind }: { kind: RequestKind }) {
  const badge = kind === "registration";  // inscription avec badge imprimé : nom complet et fonction
  const fields = useMemo<FieldDef[]>(() => [
    { name: "name", label: badge ? "Prénom et nom" : "Nom", type: "text", required: true, ...(badge ? { hint: "Tel qu'il apparaîtra sur votre badge." } : {}) },
    ...(badge ? [{ name: "job_title", label: "Fonction (facultatif)", type: "text" as const, hint: "Ex. Directrice générale, chargé de projet…" }] : []),
    { name: "organization", label: badge ? "Organisation (facultatif)" : "Organisation", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true, ...(badge ? { hint: "Votre badge y sera envoyé. Une même adresse peut servir à inscrire plusieurs personnes." } : {}) },
    { name: "phone", label: badge ? "Téléphone (facultatif)" : "Téléphone", type: "tel" },
    ...(badge ? [{ name: "options", label: "Jours prévus (facultatif, pour préparer l'accueil)", type: "multi" as const, options: REGISTRATION_OPTIONS,
      hint: "Votre badge reste valable pour les deux journées." }] : []),
    { name: "message", label: CONFIG[kind].message, type: "textarea" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ], [kind, badge]);
  return <ConfigForm endpoint="/event-requests/" extra={{ kind }} fields={fields} submitLabel={CONFIG[kind].submit} successFallback="Merci. Votre demande a bien été transmise." />;
}
