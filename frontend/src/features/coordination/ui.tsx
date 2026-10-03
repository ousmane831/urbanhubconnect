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

/** Demande une confirmation pour les actions sensibles (refus). */
export const confirmAction = (a: ActionDef) => a.tone !== "danger" || window.confirm(`Confirmer : « ${a.label} » ?`);
