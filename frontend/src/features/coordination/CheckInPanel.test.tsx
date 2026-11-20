import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { person } = vi.hoisted(() => ({
  person: { id: 7, name: "Awa Ndiaye", organization: "Exemple SA", email: "a@x.org", phone: "770000000", valid: true, reference: "GWE-0007", badge_sent: true, checkins: [] },
}));
vi.mock("../../services/coordination", () => ({
  coordApi: {
    checkinStats: vi.fn().mockResolvedValue({ registered: 12, today: 3, by_day: {} }),
    checkinSearch: vi.fn().mockResolvedValue([person]),
    checkin: vi.fn().mockResolvedValue({ result: "ok", message: "Badge valide : arrivée enregistrée.", name: "Awa Ndiaye" }),
    checkinResend: vi.fn().mockResolvedValue("Badge renvoyé à a@x.org."),
    badgesPrint: vi.fn().mockResolvedValue({ total: 12, new: 5, event: { title: "", dates: "", location: "" }, badges: [] }),
  },
  badgesZipUrl: () => "/api/coordination/badges/qr.zip",
}));
import { coordApi } from "../../services/coordination";
import { CheckInPanel } from "./CheckInPanel";

describe("Accueil : scan des badges", () => {
  it("affiche les compteurs du jour", async () => {
    render(<MemoryRouter><CheckInPanel /></MemoryRouter>);
    expect(await screen.findByText("arrivés aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("propose les badges à imprimer et l'archive des QR codes", async () => {
    render(<MemoryRouter><CheckInPanel /></MemoryRouter>);
    expect(await screen.findByText(/nouveaux badges à imprimer/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Imprimer les nouveaux" })).toHaveAttribute("href", "/coordination/badges?nouveaux=1");
    expect(screen.getByRole("link", { name: "QR codes (ZIP)" })).toHaveAttribute("href", "/api/coordination/badges/qr.zip");
  });

  it("permet de valider l'arrivée d'une personne sans QR code", async () => {
    render(<MemoryRouter><CheckInPanel /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/Nom, organisation/), "awa");
    await userEvent.click(await screen.findByRole("button", { name: "Valider l'arrivée" }, { timeout: 2000 }));
    expect(coordApi.checkin).toHaveBeenCalledWith({ id: 7 });
    expect(await screen.findByText(/Awa Ndiaye : Badge valide/)).toBeInTheDocument();
  });
});
