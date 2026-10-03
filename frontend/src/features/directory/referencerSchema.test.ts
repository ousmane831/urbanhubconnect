import { referencerSchema } from "./referencerSchema";

const valid = {
  name: "Organisation Exemple", college: "c", sector: "s", pole: "DIAMNIADIO", neighborhood: "", address: "", latitude: "", longitude: "",
  description: "Une présentation suffisamment longue.", website: "", linkedin: "", facebook: "", instagram: "",
  representative_name: "R. Exemple", representative_role: "", representative_phone: "770000000", representative_email: "a@exemple.org",
  offers: "", needs: "", commissions: [], accept_charter: true, accept_privacy: true,
};

describe("referencerSchema", () => {
  it("accepte un formulaire valide", () => expect(referencerSchema.safeParse(valid).success).toBe(true));
  it("exige les deux consentements", () => {
    expect(referencerSchema.safeParse({ ...valid, accept_charter: false }).success).toBe(false);
    expect(referencerSchema.safeParse({ ...valid, accept_privacy: false }).success).toBe(false);
  });
  it("refuse un e-mail ou une URL invalides", () => {
    expect(referencerSchema.safeParse({ ...valid, representative_email: "x" }).success).toBe(false);
    expect(referencerSchema.safeParse({ ...valid, website: "pas une url" }).success).toBe(false);
  });
  it("exige latitude et longitude ensemble et dans les bornes", () => {
    expect(referencerSchema.safeParse({ ...valid, latitude: "14.7" }).success).toBe(false);
    expect(referencerSchema.safeParse({ ...valid, latitude: "95", longitude: "-17" }).success).toBe(false);
    expect(referencerSchema.safeParse({ ...valid, latitude: "14.7", longitude: "-17.2" }).success).toBe(true);
  });
});
