import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const { campaign, overview } = vi.hoisted(() => {
  const campaign = {
    id: 3, title: "Relance partenaires", subject: "Grand Week-End : 11 et 12 décembre", body: "Bonjour {nom}", cta_label: "", cta_url: "",
    segments: ["Partenaire"], activities: [], frequency: "weekly", weekday: 0, send_time: "09:00:00", start_date: "2026-11-16", end_date: "2026-12-10",
    status: "draft", status_label: "Brouillon", schedule: "Chaque lundi à 09 h, à partir du 16/11/2026, jusqu'au 10/12/2026", recipients: 180,
    next_send: null, stats: { sent: 0, failed: 0, last_sent_at: null }, actions: ["edit", "activate", "test", "duplicate", "delete"],
  };
  return {
    campaign,
    overview: {
      contacts: { total: 200, active: 198, unsubscribed: 2, segments: [{ value: "Partenaire", count: 180 }], activities: [] },
      campaigns: [campaign], sending: { problem: "", daily_limit: 280, sent_today: 0, from: "Urban Hub Connect <infos@urbanhubconnect.com>" },
    },
  };
});
vi.mock("../../services/coordination", () => ({
  coordApi: {
    campaigns: vi.fn().mockResolvedValue(overview),
    campaignAct: vi.fn().mockResolvedValue("Campagne programmée."),
    campaignPreview: vi.fn().mockResolvedValue({ subject: "Objet", html: "<p>Bonjour</p>", recipients: 180, schedule: "" }),
    campaignImport: vi.fn().mockResolvedValue({ created: 198, updated: 0, unchanged: 0, skipped_count: 1, unsubscribed_kept: 0, columns: ["email"],
      skipped: [{ line: 4, value: "x", reason: "adresse e-mail manquante ou invalide" }] }),
  },
}));
import { coordApi } from "../../services/coordination";
import { CampaignsPanel } from "./CampaignsPanel";

describe("Campagnes d'e-mails", () => {
  it("affiche les contacts et les campagnes", async () => {
    render(<CampaignsPanel />);
    expect(await screen.findByText("Relance partenaires")).toBeInTheDocument();
    expect(screen.getByText("198")).toBeInTheDocument();
    expect(screen.getByText(/Chaque lundi à 09 h/)).toBeInTheDocument();
  });

  it("demande confirmation avant de programmer l'envoi", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CampaignsPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Programmer l'envoi" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("180 destinataire(s)"));
    expect(coordApi.campaignAct).toHaveBeenCalledWith(campaign.id, "activate", {});
    expect(await screen.findByText("Campagne programmée.")).toBeInTheDocument();
  });

  it("importe un fichier Excel et affiche le bilan", async () => {
    render(<CampaignsPanel />);
    const input = await screen.findByLabelText("Importer un fichier Excel");
    await userEvent.upload(input, new File(["x"], "contacts.xlsx"));
    expect(await screen.findByText(/198 ajoutés/)).toBeInTheDocument();
    expect(screen.getByText("1 ligne écartée")).toBeInTheDocument();
  });
});
