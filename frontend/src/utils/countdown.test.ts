import { timeLeft } from "./countdown";

describe("timeLeft", () => {
  const target = "2026-12-11T00:00:00Z";
  it("décompose le temps restant", () => {
    const now = new Date("2026-12-09T22:58:57Z").getTime();
    expect(timeLeft(target, now)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 3, done: false });
  });
  it("ne devient jamais négatif", () => {
    const r = timeLeft(target, new Date("2027-01-01T00:00:00Z").getTime());
    expect(r).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });
  it("dépend de l'instant courant", () => {
    expect(timeLeft(target, 0).days).not.toBe(timeLeft(target, new Date("2026-12-01T00:00:00Z").getTime()).days);
  });
});
