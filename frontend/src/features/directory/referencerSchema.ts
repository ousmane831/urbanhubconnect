import { z } from "zod";

const optionalUrl = z.string().trim().url("Adresse web invalide (exemple : https://…).").or(z.literal(""));
const coord = (min: number, max: number, label: string) =>
  z.string().trim().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), `${label} invalide.`);
const consent = (msg: string) => z.literal(true, { errorMap: () => ({ message: msg }) });

export const referencerSchema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom de l'organisation.").max(200),
  college: z.string().min(1, "Choisissez un collège."),
  sector: z.string().min(1, "Choisissez un secteur."),
  pole: z.string().min(1, "Choisissez un pôle."),
  neighborhood: z.string().trim().max(120),
  address: z.string().trim().max(255),
  latitude: coord(-90, 90, "Latitude"),
  longitude: coord(-180, 180, "Longitude"),
  description: z.string().trim().min(20, "Présentez votre organisation en quelques phrases (20 caractères minimum)."),
  website: optionalUrl, linkedin: optionalUrl, facebook: optionalUrl, instagram: optionalUrl,
  representative_name: z.string().trim().min(2, "Indiquez le nom du représentant."),
  representative_role: z.string().trim().max(150),
  representative_phone: z.string().trim().min(6, "Indiquez un numéro de téléphone."),
  representative_email: z.string().trim().min(1, "Indiquez une adresse e-mail.").email("Cette adresse e-mail n'est pas valide."),
  offers: z.string().trim(), needs: z.string().trim(),
  commissions: z.array(z.string()),
  accept_charter: consent("Vous devez accepter la charte du réseau."),
  accept_privacy: consent("Vous devez accepter la politique de confidentialité."),
  company_website: z.string().optional(),
}).refine((v) => (v.latitude === "") === (v.longitude === ""), { path: ["longitude"], message: "Renseignez la latitude et la longitude ensemble." });

export type ReferencerValues = z.infer<typeof referencerSchema>;
