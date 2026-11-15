import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { MapPlace } from "../../types/api";
import { fmtDistance, fmtDuration, navigationLinks } from "../../utils/geo";
import { RoutePanel } from "./RoutePanel";

const place = { name: "CICAD", slug: "cicad", address: "Diamniadio", latitude: 14.72, longitude: -17.18 } as MapPlace;
const route = {
  mode: "driving" as const, distance: 12400, duration: 1090, geometry: [[14.7, -17.2], [14.72, -17.18]] as [number, number][],
  steps: [
    { instruction: "Partez vers le nord sur N1", distance: 8000, duration: 600, type: 11, location: [14.7, -17.2] as [number, number] },
    { instruction: "Tournez à droite", distance: 4400, duration: 490, type: 1, location: [14.71, -17.19] as [number, number] },
  ],
};
const base = { place, mode: "driving" as const, route: null, loading: false, error: "", locating: false, user: null, activeStep: null,
  onMode: vi.fn(), onStep: vi.fn(), onRecenter: vi.fn(), onClose: vi.fn() };

describe("Itinéraire de la Cartographie", () => {
  it("affiche la durée, la distance et les étapes, et permet de choisir une étape", async () => {
    const onStep = vi.fn();
    render(<RoutePanel {...base} route={route} onStep={onStep} />);
    expect(screen.getByText("18 min")).toBeInTheDocument();
    expect(screen.getByText(/12 km en voiture/)).toBeInTheDocument();
    await userEvent.click(screen.getByText("Tournez à droite"));
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it("propose toujours Google Maps, Waze et Plans avec la destination", () => {
    render(<RoutePanel {...base} error="Le calcul d'itinéraire est momentanément indisponible." />);
    expect(screen.getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", expect.stringContaining("destination=14.72,-17.18"));
    expect(screen.getByRole("link", { name: "Waze" })).toHaveAttribute("href", expect.stringContaining("ll=14.72,-17.18"));
    expect(screen.getByText(/momentanément indisponible/)).toBeInTheDocument();
  });

  it("change de mode de déplacement", async () => {
    const onMode = vi.fn();
    render(<RoutePanel {...base} onMode={onMode} />);
    await userEvent.click(screen.getByRole("button", { name: "À pied" }));
    expect(onMode).toHaveBeenCalledWith("foot");
  });

  it("formate distances, durées et liens à pied", () => {
    expect([fmtDistance(447), fmtDistance(2450), fmtDistance(12400)]).toEqual(["450 m", "2,5 km", "12 km"]);
    expect([fmtDuration(312), fmtDuration(3900)]).toEqual(["5 min", "1 h 05"]);
    expect(navigationLinks([14.7, -17.2], "foot").google).toContain("travelmode=walking");
  });
});
