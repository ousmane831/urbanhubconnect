import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ErrorMessage, SuccessMessage } from "./FormMessage";

describe("Messages des formulaires", () => {
  it("amène la confirmation à l'écran et lui donne le focus", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<SuccessMessage>Merci, votre inscription est confirmée.</SuccessMessage>);
    const box = screen.getByRole("status");
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
    expect(box).toHaveFocus();
  });

  it("fait de même pour une erreur", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<ErrorMessage>Connexion impossible.</ErrorMessage>);
    expect(scroll).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveFocus();
  });
});
