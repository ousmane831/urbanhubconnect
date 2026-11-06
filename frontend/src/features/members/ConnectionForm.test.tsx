import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ConnectionForm } from "./ConnectionForm";

describe("ConnectionForm", () => {
  it("refuse un message trop court sans rien envoyer", async () => {
    const onSend = vi.fn();
    render(<ConnectionForm onSend={onSend} />);
    await userEvent.type(screen.getByLabelText("Votre message"), "court");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("trop court");
    expect(onSend).not.toHaveBeenCalled();
  });
  it("envoie le message nettoyé et affiche la confirmation du serveur", async () => {
    const onSend = vi.fn().mockResolvedValue("Votre demande est enregistrée.");
    render(<ConnectionForm onSend={onSend} />);
    await userEvent.type(screen.getByLabelText("Votre message"), "  Bonjour, nous cherchons un fournisseur local.  ");
    await userEvent.click(screen.getByRole("button", { name: "Envoyer la demande" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Votre demande est enregistrée.");
    expect(onSend).toHaveBeenCalledWith("Bonjour, nous cherchons un fournisseur local.");
  });
});
