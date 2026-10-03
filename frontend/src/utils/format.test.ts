import { fmtFcfa, fmtRange } from "./format";

describe("format", () => {
  it("formate les montants en FCFA", () => expect(fmtFcfa(500000)).toBe("500 000 FCFA"));
  it("formate une plage de dates en français (fuseau Dakar)", () =>
    expect(fmtRange("2026-12-11T00:00:00+00:00", "2026-12-13T23:59:00+00:00")).toBe("Du 11 décembre 2026 au 13 décembre 2026"));
});
