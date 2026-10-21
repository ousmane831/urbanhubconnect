import { useState, type FormEvent } from "react";
import type { ActionDef } from "../../services/coordination";

const TONES: Record<ActionDef["tone"], string> = {
  primary: "bg-green text-white hover:bg-green-2",
  danger: "border border-red-700 text-red-800 hover:bg-red-50",
  neutral: "border border-navy/30 hover:bg-offwhite",
};

export function ActionButtons({ actions, busy, onAct }: { actions: ActionDef[]; busy: boolean; onAct: (a: ActionDef) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {actions.map((a) => (
        <button key={a.id} disabled={busy} onClick={() => onAct(a)}
          className={`min-h-[48px] rounded-md px-5 text-base font-semibold disabled:opacity-50 ${TONES[a.tone]}`}>{a.label}</button>
      ))}
    </div>
  );
}

/** Demande une confirmation pour les actions sensibles (refus, suspension). */
export const confirmAction = (a: ActionDef) => a.tone !== "danger" || window.confirm(`Confirmer : « ${a.label} » ?`);

const METHODS = [["wave", "Wave"], ["orange_money", "Orange Money"], ["virement", "Virement"], ["especes", "Espèces"]];
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Petit formulaire en ligne pour les actions qui demandent une saisie : paiement ou choix de catégorie. */
export function ActionForm({ action, busy, onSubmit, onCancel }: {
  action: ActionDef; busy: boolean; onSubmit: (data: Record<string, string>) => void; onCancel: () => void;
}) {
  const [v, setV] = useState({ amount: String(action.amount ?? ""), method: "wave", reference: "", paid_on: todayIso(), category: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (action.form === "category") {
      if (!v.category) return setError("Choisissez une catégorie.");
      return onSubmit({ category: v.category });
    }
    const amount = Number(v.amount.replace(/\s/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) return setError("Saisissez un montant valide, en FCFA.");
    onSubmit({ amount: String(amount), method: v.method, reference: v.reference.trim(), paid_on: v.paid_on });
  };
  const field = "field";
  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 rounded-md border border-navy/15 bg-offwhite p-4 sm:grid-cols-2" aria-label={action.label}>
      {action.form === "category" ? (
        <div className="sm:col-span-2"><label className="mb-1 block font-semibold" htmlFor="cat">Catégorie d'adhésion</label>
          <select id="cat" className={field} value={v.category} onChange={set("category")}>
            <option value="">Choisir…</option>{action.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      ) : (
        <>
          <div><label className="mb-1 block font-semibold" htmlFor="amount">Montant reçu (FCFA)</label>
            <input id="amount" inputMode="numeric" className={field} value={v.amount} onChange={set("amount")} /></div>
          <div><label className="mb-1 block font-semibold" htmlFor="method">Mode de paiement</label>
            <select id="method" className={field} value={v.method} onChange={set("method")}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="mb-1 block font-semibold" htmlFor="ref">Référence (n° de transaction, de virement…)</label>
            <input id="ref" className={field} value={v.reference} onChange={set("reference")} /></div>
          <div><label className="mb-1 block font-semibold" htmlFor="paid">Date du paiement</label>
            <input id="paid" type="date" max={todayIso()} className={field} value={v.paid_on} onChange={set("paid_on")} /></div>
        </>)}
      {error && <p role="alert" className="font-semibold text-red-800 sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button disabled={busy} className="min-h-[48px] rounded-md bg-green px-6 font-semibold text-white hover:bg-green-2 disabled:opacity-50">Enregistrer</button>
        <button type="button" onClick={onCancel} className="min-h-[48px] rounded-md border border-navy/30 px-6 font-semibold hover:bg-white">Annuler</button>
      </div>
    </form>
  );
}
