import { fmtDays, fmtFcfa, fmtRange } from "./format";

describe("format", () => {
  it("formate les montants en FCFA", () => expect(fmtFcfa(500000)).toBe("500 000 FCFA"));
  it("deux journées consécutives (fuseau Dakar)", () => {
    expect(fmtDays("2026-12-11T09:30:00+00:00", "2026-12-12T23:59:59+00:00")).toBe("11 et 12 décembre 2026");
    expect(fmtRange("2026-12-11T09:30:00+00:00", "2026-12-12T23:59:59+00:00")).toBe("Les 11 et 12 décembre 2026");
  });
  it("plage dans le même mois", () =>
    expect(fmtRange("2026-12-11T00:00:00+00:00", "2026-12-14T23:59:00+00:00")).toBe("Du 11 au 14 décembre 2026"));
  it("plage sur deux mois", () =>
    expect(fmtRange("2026-11-30T00:00:00+00:00", "2026-12-02T23:59:00+00:00")).toBe("Du 30 novembre 2026 au 2 décembre 2026"));
  it("un seul jour", () => expect(fmtRange("2026-12-11T09:00:00+00:00", "2026-12-11T18:00:00+00:00")).toBe("11 décembre 2026"));
});
