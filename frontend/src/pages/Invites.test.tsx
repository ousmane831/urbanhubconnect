import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

const state = { kind: "Table nominative du Gala", organization: "Banque X", holder: "Directeur", quota: 2, remaining: 2, gala: true, guests: [] };
const { api } = vi.hoisted(() => ({
  api: { getGuests: vi.fn(), addGuest: vi.fn(), removeGuest: vi.fn() },
}));
vi.mock("../services/api", () => api);
import Invites from "./Invites";

describe("Lien du contact : désigner ses invités", () => {
  it("affiche le quota et ajoute un invité", async () => {
    api.getGuests.mockResolvedValue(state);
    api.addGuest.mockResolvedValue({ ...state, remaining: 1, detail: "Invité Un est ajouté(e).",
      guests: [{ id: 1, name: "Invité Un", job_title: "", organization: "Banque X", reference: "GWE-0001", badge_sent: true }] });
    render(<MemoryRouter initialEntries={["/invites/jeton"]}><Routes><Route path="/invites/:token" element={<Invites />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/avec l'accès au Gala du Pôle/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Prénom et nom/), "Invité Un");
    await userEvent.click(screen.getByRole("button", { name: "Ajouter et envoyer le badge" }));
    expect(api.addGuest).toHaveBeenCalledWith("jeton", { name: "Invité Un", job_title: "", organization: "", email: "" });
    expect(await screen.findByText("Invité Un est ajouté(e).")).toBeInTheDocument();
    expect(screen.getByText("GWE-0001")).toBeInTheDocument();
  });
});
