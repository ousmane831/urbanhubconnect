import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../services/api", () => ({
  getBadge: vi.fn().mockResolvedValue({
    name: "Mariama Ba", job_title: "Directrice", organization: "Sen Agro", event: { title: "Le Grand Week-End du Pôle 2026", dates: "11 et 12 décembre 2026", location: "Diamniadio · Lac Rose" },
  }),
}));
import JySerai from "./JySerai";

// jsdom ne dessine pas : le canevas est simplement ignoré
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement["getContext"];

const page =(url: string) => render(<MemoryRouter initialEntries={[url]}><JySerai /></MemoryRouter>);

describe("Visuel « J'y serai ! »", () => {
  it("préremplit le nom et la fonction depuis le lien du badge", async () => {
    page("/jy-serai?badge=abc123abc123abc123");
    expect(await screen.findByDisplayValue("Mariama Ba")).toBeInTheDocument();
    expect(screen.getByLabelText(/Fonction · organisation/)).toHaveValue("Directrice · Sen Agro");
  });

  it("fonctionne aussi sans badge et rappelle que la photo reste sur l'appareil", () => {
    page("/jy-serai");
    expect(screen.getByLabelText("Prénom et nom")).toHaveValue("");
    expect(screen.getByText(/Ajouter votre photo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Télécharger l'image/ })).toBeInTheDocument();
    expect(screen.getByText(/elle n'est envoyée nulle part/)).toBeInTheDocument();
  });
});
