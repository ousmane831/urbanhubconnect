import {
  Award, BadgeCheck, Briefcase, Building2, CalendarDays, CircleAlert, CircleCheck, Handshake, HeartHandshake, IdCard, Inbox, Mail, MapPin,
  Megaphone, Newspaper, PauseCircle, RefreshCw, Trophy, X, type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { ActionDef } from "../../services/coordination";

const TONES: Record<ActionDef["tone"], string> = {
  primary: "bg-green text-white hover:bg-green-2",
  danger: "border border-red-700/40 bg-white text-red-800 hover:bg-red-50",
  neutral: "border border-navy/20 bg-white hover:bg-offwhite",
};

export function ActionButtons({ actions, busy, onAct }: { actions: ActionDef[]; busy: boolean; onAct: (a: ActionDef) => void }) {
  return (
    <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
      {actions.map((a) => (
        <button key={a.id} disabled={busy} onClick={() => onAct(a)}
          className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50 sm:text-base ${TONES[a.tone]}`}>{a.label}</button>
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
  const [v, setV] = useState({ amount: String(action.amount ?? ""), method: "wave", reference: "", paid_on: todayIso(), category: "", note: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (action.form === "category") {
      if (!v.category) return setError("Choisissez une catégorie.");
      return onSubmit({ category: v.category });
    }
    if (action.form === "complement") {
      if (!v.note.trim()) return setError("Précisez l'élément attendu.");
      return onSubmit({ note: v.note.trim() });
    }
    const amount = Number(v.amount.replace(/\s/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) return setError("Saisissez un montant valide, en FCFA.");
    onSubmit({ amount: String(amount), method: v.method, reference: v.reference.trim(), paid_on: v.paid_on });
  };
  const field = "field";
  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 rounded-md border border-navy/15 bg-offwhite p-4 sm:grid-cols-2" aria-label={action.label}>
      {action.form === "complement" ? (
        <div className="sm:col-span-2"><label className="mb-1 block font-semibold" htmlFor="note">Élément attendu</label>
          <textarea id="note" rows={3} className={field} value={v.note} onChange={set("note")}
            placeholder="Ex. une copie de votre carte de presse" />
          <p className="mt-1 text-sm text-navy/60">La personne reçoit un e-mail avec un bouton « Compléter mon dossier ».</p></div>
      ) : action.form === "category" ? (
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

// ---------- Éléments communs de l'Espace Coordination ----------
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-navy/65">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, icon: Icon, actions, children, className = "" }: {
  title?: string; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-navy/10 bg-white p-4 shadow-soft sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="flex items-center gap-2 text-lg">{Icon && <Icon className="h-5 w-5 text-green" aria-hidden />}{title}</h2>}
          {actions}
        </div>)}
      {children}
    </section>
  );
}

const PILL: Record<string, string> = {
  green: "bg-green/10 text-green", gold: "bg-gold/15 text-[#7a5c17]", navy: "bg-navy/10 text-navy", grey: "bg-offwhite text-navy/70", red: "bg-red-50 text-red-800",
};
export function Pill({ tone = "grey", children }: { tone?: keyof typeof PILL; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL[tone]}`}>{children}</span>;
}

/** Message de retour après une action (succès ou erreur), annoncé aux lecteurs d'écran. */
export function Notice({ notice, onClose }: { notice: { ok: boolean; text: string } | null; onClose?: () => void }) {
  if (!notice?.text) return null;
  return (
    <div role="status" aria-live="polite"
      className={`mb-4 flex items-start gap-3 rounded-xl border p-3.5 text-sm font-semibold ${notice.ok ? "border-green/30 bg-green/5 text-green" : "border-red-300 bg-red-50 text-red-900"}`}>
      {notice.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <span className="flex-1">{notice.text}</span>
      {onClose && <button onClick={onClose} className="-m-1 rounded p-1 opacity-70 hover:opacity-100" aria-label="Fermer le message"><X className="h-4 w-4" /></button>}
    </div>
  );
}

/** Icône de chaque file « à traiter » (clé envoyée par le serveur). */
export const KIND_ICONS: Record<string, LucideIcon> = {
  organizations: Building2, memberships: IdCard, members: BadgeCheck, renewals: RefreshCw, suspended: PauseCircle,
  connections: Handshake, opportunities: Megaphone, partnerships: Award, accreditations: Newspaper, awards: Trophy,
  "business-connect": Briefcase, "event-requests": CalendarDays, volunteers: HeartHandshake, suggestions: MapPin, messages: Mail,
};
export const kindIcon = (kind: string): LucideIcon => KIND_ICONS[kind] ?? Inbox;
