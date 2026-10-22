import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("refuse un mot de passe trop court", () => expect(passwordProblem("court", "court")).toMatch(/au moins 10/));
  it("refuse un mot de passe uniquement numérique", () => expect(passwordProblem("12345678901234", "12345678901234")).toMatch(/chiffres/));
  it("refuse deux saisies différentes", () => expect(passwordProblem("Mot-de-passe-123", "Mot-de-passe-124")).toMatch(/identiques/));
  it("accepte un mot de passe correct", () => expect(passwordProblem("Mot-de-passe-123", "Mot-de-passe-123")).toBeNull());
});
