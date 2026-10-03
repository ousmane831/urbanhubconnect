import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("../../services/coordination", () => ({
  coordApi: {
    csrf: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockRejectedValue(new Error("non connecté")),
    login: vi.fn().mockRejectedValue(new Error("refusé")),
    summary: vi.fn(), logout: vi.fn(),
  },
}));
import { CoordinationApp } from "./CoordinationApp";

describe("CoordinationApp", () => {
  it("affiche la connexion quand personne n'est connecté, jamais le tableau de bord", async () => {
    render(<CoordinationApp />);
    expect(await screen.findByRole("heading", { name: "Espace Coordination" })).toBeInTheDocument();
    expect(screen.queryByText(/à traiter/i)).not.toBeInTheDocument();
  });
  it("affiche une erreur claire si la connexion échoue", async () => {
    render(<CoordinationApp />);
    await userEvent.type(await screen.findByLabelText("Identifiant"), "boss");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "faux");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
