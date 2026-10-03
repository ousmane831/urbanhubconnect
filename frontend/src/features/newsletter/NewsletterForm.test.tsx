import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { NewsletterForm } from "./NewsletterForm";
import * as api from "../../services/api";

describe("NewsletterForm", () => {
  it("refuse une adresse vide ou invalide sans appeler l'API", async () => {
    const spy = vi.spyOn(api, "submitForm");
    render(<NewsletterForm />);
    await userEvent.click(screen.getByRole("button", { name: "S'abonner" }));
    expect(await screen.findByText("Saisissez votre adresse e-mail.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Recevoir/), "pas-un-email");
    await userEvent.click(screen.getByRole("button", { name: "S'abonner" }));
    expect(await screen.findByText("Cette adresse e-mail n'est pas valide.")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("affiche la confirmation du backend après envoi", async () => {
    vi.spyOn(api, "submitForm").mockResolvedValue("Merci, votre inscription à la newsletter est enregistrée.");
    render(<NewsletterForm />);
    await userEvent.type(screen.getByLabelText(/Recevoir/), "a@x.org");
    await userEvent.click(screen.getByRole("button", { name: "S'abonner" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("inscription"));
  });
});
