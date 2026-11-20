import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const { getBadge } = vi.hoisted(() => ({
  getBadge: vi.fn().mockResolvedValue({
    owner: true, confirmed: true, name: "Mariama Ba", job_title: "Directrice", organization: "Sen Agro",
    event: { title: "Le Grand Week-End du Pôle 2026", dates: "11 et 12 décembre 2026", location: "The Ground, Diamniadio" },
  }),
}));
vi.mock("../services/api", () => ({ getBadge }));
import JySerai from "./JySerai";

// jsdom ne dessine pas : le canevas est simplement ignoré
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement["getContext"];

const page = (url: string) => render(<MemoryRouter initialEntries={[url]}><JySerai /></MemoryRouter>);

describe("Visuel « J'y serai ! »", () => {
  it("ne préremplit rien : le nom de l'inscription se reprend d'un clic", async () => {
    page("/jy-serai?badge=abc123abc123abc123&cle=k");
    const reuse = await screen.findByRole("button", { name: /Reprendre le nom de mon inscription/ });
    expect(screen.getByLabelText("Nom à afficher")).toHaveValue("");
    await userEvent.click(reuse);
    expect(screen.getByLabelText("Nom à afficher")).toHaveValue("Mariama Ba");
    expect(screen.getByLabelText(/Fonction · organisation/)).toHaveValue("Directrice · Sen Agro");
  });

  it("un lien sans clé ne charge aucune donnée", () => {
    getBadge.mockClear();
    page("/jy-serai?badge=abc123abc123abc123");
    expect(getBadge).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Reprendre le nom/ })).not.toBeInTheDocument();
  });

  it("propose deux formats, rappelle que le visuel n'est pas un badge et que la photo reste sur l'appareil", () => {
    page("/jy-serai");
    expect(screen.getByText("Publication")).toBeInTheDocument();
    expect(screen.getByText("Story ou statut")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Télécharger mon visuel/ })).toBeInTheDocument();
    expect(screen.getByText("Visuel de communication. Ne vaut pas badge d'accès.")).toBeInTheDocument();
    expect(screen.getByText(/elle n'est envoyée nulle part/)).toBeInTheDocument();
  });
});
