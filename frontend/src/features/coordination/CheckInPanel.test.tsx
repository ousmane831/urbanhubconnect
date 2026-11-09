import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const { person } = vi.hoisted(() => ({
  person: { id: 7, name: "Awa Ndiaye", organization: "Exemple SA", email: "a@x.org", phone: "770000000", valid: true, planting: true, badge_sent: true, checkins: [] },
}));
vi.mock("../../services/coordination", () => ({
  coordApi: {
    checkinStats: vi.fn().mockResolvedValue({ registered: 12, today: 3, by_day: {}, planting_taken: 5, planting_seats: 40 }),
    checkinSearch: vi.fn().mockResolvedValue([person]),
    checkin: vi.fn().mockResolvedValue({ result: "ok", message: "Badge valide : arrivée enregistrée.", name: "Awa Ndiaye" }),
    checkinResend: vi.fn().mockResolvedValue("Badge renvoyé à a@x.org."),
  },
}));
import { coordApi } from "../../services/coordination";
import { CheckInPanel } from "./CheckInPanel";

describe("Accueil : scan des badges", () => {
  it("affiche les compteurs du jour et du convoi", async () => {
    render(<CheckInPanel />);
    expect(await screen.findByText("arrivés aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("/ 40", { exact: false })).toBeInTheDocument();
  });

  it("permet de valider l'arrivée d'une personne sans QR code", async () => {
    render(<CheckInPanel />);
    await userEvent.type(screen.getByLabelText(/Nom, organisation/), "awa");
    await userEvent.click(await screen.findByRole("button", { name: "Valider l'arrivée" }, { timeout: 2000 }));
    expect(coordApi.checkin).toHaveBeenCalledWith({ id: 7 });
    expect(await screen.findByText(/Awa Ndiaye : Badge valide/)).toBeInTheDocument();
  });
});
