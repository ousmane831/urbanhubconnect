import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const { board, api } = vi.hoisted(() => {
  const board = {
    slots: [{ id: 1, label: "Vendredi 11/12 · 11:30–11:50", published: true }, { id: 2, label: "Samedi 12/12 · 15:00–15:20", published: false }],
    participants: [
      { id: 7, reference: "BC-00007", name: "Awa", organization: "Sen Agro", job_title: "", offers: "Conseil", needs: "Clients", objective: "", slots: [1], days: [], status: "Reçue", meetings: 0 },
      { id: 8, reference: "BC-00008", name: "Bintou", organization: "", job_title: "", offers: "", needs: "", objective: "", slots: [], days: ["samedi"], status: "Reçue", meetings: 0 },
    ],
    meetings: [] as unknown[],
  };
  const withMeeting = { ...board, meetings: [{ id: 3, first: 7, second: 8, first_name: "Awa", second_name: "Bintou", slot: 1, slot_label: "Vendredi 11/12 · 11:30–11:50", table: "T1", status: "proposed", status_label: "Proposé (non communiqué)", conflicts: [] }] };
  return {
    board,
    api: {
      bcBoard: vi.fn().mockResolvedValue(board),
      bcCreate: vi.fn().mockResolvedValue({ detail: "Rendez-vous proposé : il n'est pas encore communiqué.", board: withMeeting }),
      bcConfirm: vi.fn().mockResolvedValue({ detail: "Rendez-vous confirmé : 2 e-mail(s) envoyé(s) aux participants.", board: withMeeting }),
      bcRelease: vi.fn(), bcAgenda: vi.fn(),
    },
  };
});
vi.mock("../../services/coordination", () => ({ coordApi: api }));
import { BusinessConnectPanel } from "./BusinessConnectPanel";

describe("Business Connect (Coordination)", () => {
  it("ne propose que les créneaux publiés, puis propose et confirme un rendez-vous", async () => {
    render(<BusinessConnectPanel />);
    await userEvent.selectOptions(await screen.findByLabelText("Participant 1"), "7");
    expect(screen.getByText(/Propose :/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Participant 2"), "8");
    const slot = screen.getByLabelText("Créneau (publié)");
    expect(slot.querySelectorAll("option")).toHaveLength(2);  // « Choisir… » + le seul créneau publié
    await userEvent.selectOptions(slot, "1");
    await userEvent.type(screen.getByLabelText("Table (facultatif)"), "T1");
    await userEvent.click(screen.getByRole("button", { name: "Proposer le rendez-vous" }));
    expect(api.bcCreate).toHaveBeenCalledWith({ first: 7, second: 8, slot: 1, table: "T1" });
    expect(await screen.findByText("Proposé (non communiqué)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer et prévenir" }));
    expect(api.bcConfirm).toHaveBeenCalledWith(3);
    expect(await screen.findByText(/2 e-mail\(s\) envoyé\(s\)/)).toBeInTheDocument();
    expect(board.slots).toHaveLength(2);
  });
});
