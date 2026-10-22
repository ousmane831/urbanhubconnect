import { z } from "zod";

const optUrl = z.string().trim().url("Adresse web invalide (exemple : https://…).").or(z.literal(""));
const optEmail = z.string().trim().email("Cette adresse e-mail n'est pas valide.").or(z.literal(""));
const coord = (min: number, max: number, label: string) =>
  z.string().trim().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), `${label} invalide.`);

export const profileSchema = z.object({
  description: z.string().trim().max(500, "500 caractères maximum."),
  website: optUrl, linkedin: optUrl, facebook: optUrl, instagram: optUrl,
  neighborhood: z.string().trim().max(120), address: z.string().trim().max(255),
  latitude: coord(-90, 90, "Latitude"), longitude: coord(-180, 180, "Longitude"),
  representative_name: z.string().trim().max(150), representative_role: z.string().trim().max(150),
  representative_phone: z.string().trim().max(30), representative_email: optEmail,
  phone: z.string().trim().max(30), email: optEmail,
  offers: z.string().trim().max(2000), needs: z.string().trim().max(2000),
}).refine((v) => (v.latitude === "") === (v.longitude === ""), { path: ["longitude"], message: "Renseignez la latitude et la longitude ensemble." });

export type ProfileFormValues = z.infer<typeof profileSchema>;
