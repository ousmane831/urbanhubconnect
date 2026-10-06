import { proposeSchema } from "./ProposePlaceForm";

const base = { name: "Lieu", category: "sante", address: "", latitude: "", longitude: "", phone: "", email: "", opening_hours: "", submitter_name: "Moi", submitter_email: "moi@x.org" };

describe("proposeSchema", () => {
  it("exige une adresse ou un point sur la carte", () => {
    expect(proposeSchema.safeParse(base).success).toBe(false);
    expect(proposeSchema.safeParse({ ...base, address: "Avenue 1" }).success).toBe(true);
    expect(proposeSchema.safeParse({ ...base, latitude: "14.7", longitude: "-17.2" }).success).toBe(true);
  });
  it("valide les e-mails", () => {
    expect(proposeSchema.safeParse({ ...base, address: "A", email: "x" }).success).toBe(false);
    expect(proposeSchema.safeParse({ ...base, address: "A", submitter_email: "x" }).success).toBe(false);
  });
});
