import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../../services/members", () => ({
  memberApi: { csrf: vi.fn().mockResolvedValue({}), login: vi.fn().mockRejectedValue(new Error("refusé")) },
}));
vi.mock("../../services/api", () => ({ getPage: vi.fn().mockResolvedValue({ title: "Espace membres", slug: "espace-membres", content: "Accès réservé aux membres." }) }));
import { LoginPanel } from "./LoginPanel";

describe("LoginPanel", () => {
  it("affiche le texte de présentation, le lien de mot de passe oublié et une erreur claire si la connexion échoue", async () => {
    const onLogin = vi.fn();
    render(<MemoryRouter><LoginPanel onLogin={onLogin} /></MemoryRouter>);
    expect(await screen.findByText("Accès réservé aux membres.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveAttribute("href", "/espace-membres/mot-de-passe-oublie");
    expect(screen.getByRole("link", { name: "Adhérer au réseau" })).toHaveAttribute("href", "/adherer");
    await userEvent.type(screen.getByLabelText(/Identifiant/), "a@x.org");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "faux");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
