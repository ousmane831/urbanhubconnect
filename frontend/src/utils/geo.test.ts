import { distanceKm } from "./geo";

describe("distanceKm", () => {
  it("vaut 0 pour un même point", () => expect(distanceKm([14.72, -17.18], [14.72, -17.18])).toBe(0));
  it("estime Dakar - Diamniadio à environ 30 km", () => {
    const d = distanceKm([14.6937, -17.4441], [14.7167, -17.1833]);
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(32);
  });
});
