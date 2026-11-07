import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { ActionDef } from "../../services/coordination";
import { ActionButtons, ActionForm, confirmAction } from "./ui";

const payment: ActionDef = { id: "payment", label: "Enregistrer le paiement", tone: "primary", form: "payment", amount: 150000 };
const cancel: ActionDef = { id: "cancel_payment", label: "Annuler le dernier paiement (erreur de saisie)", tone: "danger" };

describe("Espace Coordination : actions", () => {
  it("demande une confirmation uniquement pour les actions sensibles", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(confirmAction(payment)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(confirmAction(cancel)).toBe(false);
    expect(confirm).toHaveBeenCalledWith("Confirmer : « Annuler le dernier paiement (erreur de saisie) » ?");
    confirm.mockRestore();
  });

  it("affiche un bouton par action et transmet l'action choisie", async () => {
    const onAct = vi.fn();
    render(<ActionButtons actions={[payment, cancel]} busy={false} onAct={onAct} />);
    await userEvent.click(screen.getByRole("button", { name: cancel.label }));
    expect(onAct).toHaveBeenCalledWith(cancel);
  });

  it("refuse un montant invalide et envoie un paiement correct", async () => {
    const onSubmit = vi.fn();
    render(<ActionForm action={payment} busy={false} onSubmit={onSubmit} onCancel={() => {}} />);
    const amount = screen.getByLabelText("Montant reçu (FCFA)");
    expect(amount).toHaveValue("150000");
    await userEvent.clear(amount);
    await userEvent.type(amount, "0");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("montant valide");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.clear(amount);
    await userEvent.type(amount, "150 000");
    await userEvent.type(screen.getByLabelText(/Référence/), " WAVE-12 ");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: "150000", method: "wave", reference: "WAVE-12" }));
  });

  it("exige une catégorie avant d'enregistrer le choix", async () => {
    const onSubmit = vi.fn();
    const action: ActionDef = { id: "set_category", label: "Choisir la catégorie", tone: "primary", form: "category",
      options: [{ value: "pme", label: "PME · 150000 FCFA" }] };
    render(<ActionForm action={action} busy={false} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisissez une catégorie");
    await userEvent.selectOptions(screen.getByLabelText("Catégorie d'adhésion"), "pme");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSubmit).toHaveBeenCalledWith({ category: "pme" });
  });
});
