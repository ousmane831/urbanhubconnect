import { profileSchema } from "./profileSchema";

const base = { description: "", website: "", linkedin: "", facebook: "", instagram: "", neighborhood: "", address: "", latitude: "", longitude: "",
  representative_name: "", representative_role: "", representative_phone: "", representative_email: "", phone: "", email: "", offers: "", needs: "" };

describe("profileSchema", () => {
  it("accepte un formulaire vide ou rempli correctement", () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, website: "https://exemple.org", latitude: "14.7", longitude: "-17.2", email: "a@x.org" }).success).toBe(true);
  });
  it("limite la présentation à 500 caractères", () => expect(profileSchema.safeParse({ ...base, description: "x".repeat(501) }).success).toBe(false));
  it("refuse une URL ou un e-mail invalides", () => {
    expect(profileSchema.safeParse({ ...base, website: "pas une url" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, representative_email: "x" }).success).toBe(false);
  });
  it("exige latitude et longitude ensemble et dans les bornes", () => {
    expect(profileSchema.safeParse({ ...base, latitude: "14.7" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, latitude: "95", longitude: "-17" }).success).toBe(false);
  });
});
