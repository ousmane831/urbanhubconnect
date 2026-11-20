import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

const row = {
  kind: "event-requests", id: 3, type: "Inscription au Grand Week-End du Pôle", reference: "GWE-0003", name: "Awa Ndiaye",
  status: "accepted", status_label: "Confirmée", next_step: "Votre inscription est confirmée.", created_at: "2026-11-20T10:00:00Z",
  can_complete: false, can_cancel: true, badge_url: "/badge/t?cle=k", visual_url: "/jy-serai?badge=t&cle=k",
};
const { api } = vi.hoisted(() => ({
  api: {
    requestTrackingLink: vi.fn().mockResolvedValue("Si un dossier correspond à cette adresse, un lien personnel vient d'y être envoyé."),
    getTracking: vi.fn(),
    cancelDossier: vi.fn(),
    completeDossier: vi.fn(),
  },
}));
vi.mock("../services/api", () => api);
import Suivi, { SuiviHome } from "./Suivi";

const at = (url: string) => render(
  <MemoryRouter initialEntries={[url]}><Routes><Route path="/suivi" element={<SuiviHome />} /><Route path="/suivi/:token" element={<Suivi />} /></Routes></MemoryRouter>);

describe("Suivi des dossiers sans compte", () => {
  it("envoie le lien personnel avec la même réponse pour toute adresse", async () => {
    at("/suivi");
    await userEvent.type(screen.getByLabelText("Adresse e-mail"), "a@x.org");
    await userEvent.click(screen.getByRole("button", { name: /Recevoir mon lien/ }));
    expect(api.requestTrackingLink).toHaveBeenCalledWith("a@x.org");
    expect(await screen.findByText(/un lien personnel vient d'y être envoyé/)).toBeInTheDocument();
  });

  it("affiche les dossiers, le badge et permet d'annuler", async () => {
    api.getTracking.mockResolvedValue({ email: "a•••@x.org", dossiers: [row] });
    api.cancelDossier.mockResolvedValue({ detail: "Votre inscription GWE-0003 est annulée.", dossier: { ...row, status: "cancelled", status_label: "Annulée", can_cancel: false, badge_url: undefined } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    at("/suivi/jeton");
    expect(await screen.findByText("GWE-0003 · Awa Ndiaye")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir et télécharger mon badge/ })).toHaveAttribute("href", "/badge/t?cle=k");
    await userEvent.click(screen.getByRole("button", { name: /Annuler mon inscription/ }));
    expect(await screen.findByText("Annulée")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Voir et télécharger mon badge/ })).not.toBeInTheDocument();
  });

  it("propose un nouveau lien quand le lien a expiré", async () => {
    api.getTracking.mockRejectedValue(new Error("410"));
    at("/suivi/expire");
    expect(await screen.findByText(/Ce lien a expiré/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recevoir mon lien/ })).toBeInTheDocument();
  });

  it("l'assistance propose d'abord l'action directe", async () => {
    at("/suivi");
    await userEvent.click(screen.getByLabelText("Je n'ai pas reçu mon badge"));
    expect(screen.getByText(/Le plus rapide : demandez votre lien personnel/)).toBeInTheDocument();
  });
});
