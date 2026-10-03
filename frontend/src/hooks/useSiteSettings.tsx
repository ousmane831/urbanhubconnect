import { createContext, useContext, type ReactNode } from "react";
import { getSiteSettings } from "../services/api";
import type { SiteSettings } from "../types/api";
import { useAsync } from "./useAsync";

// Valeurs du cahier des charges, utilisées avant la réponse de l'API ou si elle échoue.
export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Urban Hub Connect", phone: "+221 78 309 56 56", whatsapp: "221783095656",
  email: "infosurbanhubconnect@gmail.com", address: "SD City, Villa 115, Pôle urbain de Diamniadio",
  linkedin: "", facebook: "", instagram: "",
  footer_text: "Association en cours de constitution · Initiative portée par M'ma Conciergerie",
  legal_information: "", privacy_policy: "",
};
const Ctx = createContext<SiteSettings>(DEFAULT_SETTINGS);
export const SiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { data } = useAsync(getSiteSettings);
  return <Ctx.Provider value={data ?? DEFAULT_SETTINGS}>{children}</Ctx.Provider>;
};
export const useSiteSettings = () => useContext(Ctx);
