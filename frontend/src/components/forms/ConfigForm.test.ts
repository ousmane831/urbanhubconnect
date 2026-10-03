import { buildSchema, type FieldDef } from "./ConfigForm";

const fields: FieldDef[] = [
  { name: "name", label: "Nom", type: "text", required: true },
  { name: "email", label: "E-mail", type: "email", required: true },
  { name: "phone", label: "Tél.", type: "tel" },
  { name: "consent", label: "OK", type: "consent" },
];

describe("buildSchema", () => {
  const schema = buildSchema(fields);
  it("valide des données correctes", () => expect(schema.safeParse({ name: "A", email: "a@x.org", phone: "", consent: true }).success).toBe(true));
  it("exige les champs obligatoires et le consentement", () => {
    expect(schema.safeParse({ name: "", email: "a@x.org", phone: "", consent: true }).success).toBe(false);
    expect(schema.safeParse({ name: "A", email: "a@x.org", phone: "", consent: false }).success).toBe(false);
  });
  it("refuse un e-mail invalide", () => expect(schema.safeParse({ name: "A", email: "x", phone: "", consent: true }).success).toBe(false));
});
