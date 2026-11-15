import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { summary } = vi.hoisted(() => ({
  summary: {
    queues: [
      { kind: "memberships", label: "Adhésions", count: 3 },
      { kind: "messages", label: "Messages reçus", count: 1 },
      { kind: "members", label: "Membres à jour", count: 40 },
      { kind: "awards", label: "Candidatures Awards", count: 0 },
    ],
    stats: [{ label: "Membres à jour", value: 40 }], to_handle: 4,
  },
}));
vi.mock("../../services/coordination", () => ({
  coordApi: {
    csrf: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockResolvedValue({ username: "awa", name: "Awa Ndiaye", role: "COORDINATION" }),
    summary: vi.fn().mockResolvedValue(summary),
    queue: vi.fn().mockResolvedValue({ label: "Adhésions", items: [] }),
    content: vi.fn().mockResolvedValue({ articles: [], events: [] }),
    logout: vi.fn().mockResolvedValue({}),
  },
}));
import { CoordinationApp } from "./CoordinationApp";

const app = () => render(<MemoryRouter><CoordinationApp /></MemoryRouter>);

describe("Espace Coordination : navigation", () => {
  beforeEach(() => window.history.replaceState(null, "", "/coordination"));

  it("accueille la personne et met en avant les demandes en attente", async () => {
    app();
    expect(await screen.findByRole("heading", { name: "Bonjour Awa" })).toBeInTheDocument();
    expect(screen.getByText("demandes en attente de traitement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commencer : Adhésions/ })).toBeInTheDocument();
  });

  it("ouvre une file depuis le tableau de bord et garde l'onglet dans l'adresse", async () => {
    app();
    await userEvent.click(await screen.findByRole("button", { name: /Commencer : Adhésions/ }));
    expect(await screen.findByRole("heading", { name: "À traiter" })).toBeInTheDocument();
    expect(window.location.search).toBe("?onglet=queue");
  });

  it("propose les mêmes sections dans la barre du bas sur téléphone", async () => {
    app();
    const mobile = await screen.findByRole("navigation", { name: "Sections (mobile)" });
    await userEvent.click(within(mobile).getByRole("button", { name: /Contenus/ }));
    expect(await screen.findByRole("heading", { name: "Publications" })).toBeInTheDocument();
  });
});
