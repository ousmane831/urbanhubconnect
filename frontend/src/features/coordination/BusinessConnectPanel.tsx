import { CalendarClock, Handshake, Send, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type BcBoard, type BcMeeting, type BcParticipant } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";
import { Notice, PageHeader, Panel, Pill } from "./ui";

const TONE: Record<string, "gold" | "green" | "grey"> = { proposed: "gold", confirmed: "green", cancelled: "grey" };
const who = (p?: BcParticipant) => (p ? `${p.name}${p.organization ? ` · ${p.organization}` : ""}` : "");

/** Business Connect : la Coordination associe les demandes, propose puis confirme des rendez-vous sur les créneaux publiés.
 *  Un rendez-vous proposé n'est pas communiqué ; la confirmation et la libération préviennent les deux participants. */
export function BusinessConnectPanel() {
  const [version, setVersion] = useState(0);
  const state = useAsync(coordApi.bcBoard, [version]);
  const [board, setBoard] = useState<BcBoard | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ first: "", second: "", slot: "", table: "" });
  const data = board ?? state.data;

  const run = async (fn: () => Promise<{ detail: string; board?: BcBoard }>) => {
    setBusy(true); setNotice(null);
    try { const r = await fn(); setNotice({ ok: true, text: r.detail }); if (r.board) setBoard(r.board); else setVersion((v) => v + 1); }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(false); }
  };
  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!form.first || !form.second || !form.slot) return setNotice({ ok: false, text: "Choisissez deux participants et un créneau." });
    run(async () => { const r = await coordApi.bcCreate({ first: +form.first, second: +form.second, slot: +form.slot, table: form.table }); setForm({ ...form, second: "", table: "" }); return r; });
  };

  const byId = useMemo(() => new Map((data?.participants ?? []).map((p) => [p.id, p])), [data]);
  const published = (data?.slots ?? []).filter((s) => s.published);
  const available = (p: BcParticipant | undefined, slot: string) => !slot || !p?.slots.length || p.slots.includes(+slot);
  const bySlot = useMemo(() => {
    const groups = new Map<string, BcMeeting[]>();
    for (const m of data?.meetings ?? []) groups.set(m.slot_label, [...(groups.get(m.slot_label) ?? []), m]);
    return [...groups.entries()];
  }, [data]);

  return (
    <div>
      <PageHeader title="Business Connect" description="Associez les demandes, proposez un rendez-vous, puis confirmez-le : les deux participants reçoivent alors uniquement le créneau attribué." />
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <Async state={state}>{() => data && (
        <div className="space-y-6">
          {!published.length && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">Aucun créneau publié. Ajoutez les créneaux approuvés dans l'administration
              (<a className="font-semibold underline" href="/admin/events/businessconnectslot/">Événements › Créneaux Business Connect</a>) et cochez « publié ».</p>)}

          <Panel title="Nouveau rendez-vous" icon={Handshake}>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              {(["first", "second"] as const).map((k, i) => (
                <div key={k}><label htmlFor={`bc-${k}`} className="mb-1 block text-sm font-semibold">Participant {i + 1}</label>
                  <select id={`bc-${k}`} className="field" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
                    <option value="">Choisir…</option>
                    {data.participants.map((p) => <option key={p.id} value={p.id}>{who(p)} ({p.meetings} rdv)</option>)}
                  </select>
                  {form[k] && (() => { const p = byId.get(+form[k]); return p && (
                    <div className="mt-2 space-y-1 rounded-lg bg-offwhite p-3 text-sm">
                      {p.offers && <p><strong>Propose :</strong> {p.offers}</p>}
                      {p.needs && <p><strong>Recherche :</strong> {p.needs}</p>}
                      {p.objective && <p><strong>Objectif :</strong> {p.objective}</p>}
                      {!available(p, form.slot) && <p className="font-semibold text-[#7a5c17]">Ce créneau ne fait pas partie de ses disponibilités.</p>}
                    </div>); })()}
                </div>))}
              <div><label htmlFor="bc-slot" className="mb-1 block text-sm font-semibold">Créneau (publié)</label>
                <select id="bc-slot" className="field" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
                  <option value="">Choisir…</option>{published.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
              <div><label htmlFor="bc-table" className="mb-1 block text-sm font-semibold">Table (facultatif)</label>
                <input id="bc-table" className="field" maxLength={20} value={form.table} onChange={(e) => setForm({ ...form, table: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <button disabled={busy} className="min-h-[48px] rounded-lg bg-green px-6 font-semibold text-white hover:bg-green-2 disabled:opacity-60">Proposer le rendez-vous</button>
                <p className="mt-2 text-sm text-navy/60">Le système refuse un participant déjà pris ou une table occupée sur le même créneau.</p>
              </div>
            </form>
          </Panel>

          <Panel title={`Rendez-vous (${data.meetings.length})`} icon={CalendarClock}>
            {!bySlot.length ? <p className="text-navy/60">Aucun rendez-vous pour le moment.</p> : (
              <div className="space-y-5">{bySlot.map(([label, list]) => (
                <section key={label}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/60">{label}</h3>
                  <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10">{list.map((m) => (
                    <li key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{m.first_name} × {m.second_name}{m.table && <span className="font-normal text-navy/60"> · table {m.table}</span>}</p>
                        <Pill tone={TONE[m.status]}>{m.status_label}</Pill>
                        {m.conflicts.map((c) => <p key={c} className="mt-1 text-sm font-semibold text-red-800">{c}</p>)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {m.status === "proposed" && <button disabled={busy} onClick={() => run(() => coordApi.bcConfirm(m.id))}
                          className="min-h-[44px] rounded-lg bg-green px-4 font-semibold text-white hover:bg-green-2 disabled:opacity-60">Confirmer et prévenir</button>}
                        <button disabled={busy} onClick={() => window.confirm(m.status === "confirmed" ? "Libérer ce créneau ? Les deux participants seront prévenus de l'annulation." : "Libérer ce créneau ?") && run(() => coordApi.bcRelease(m.id))}
                          className="min-h-[44px] rounded-lg border border-red-300 px-4 font-semibold text-red-800 disabled:opacity-60">Libérer</button>
                      </div>
                    </li>))}</ul>
                </section>))}</div>)}
          </Panel>

          <Panel title={`Participants (${data.participants.length})`} icon={Users}>
            <ul className="divide-y divide-navy/10">{data.participants.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="font-semibold">{who(p)} <span className="text-sm font-normal text-navy/60">{p.reference}</span></p>
                  <p className="text-sm text-navy/70">{p.meetings} rendez-vous · {p.slots.length ? `${p.slots.length} créneau(x) disponible(s)` : p.days.join(" et ") || "disponibilités non précisées"}</p></div>
                <button disabled={busy || !p.meetings} onClick={() => run(() => coordApi.bcAgenda(p.id))}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-navy/20 px-4 font-semibold hover:bg-offwhite disabled:opacity-50">
                  <Send className="h-4 w-4" aria-hidden />Envoyer l'agenda</button>
              </li>))}</ul>
          </Panel>
        </div>)}
      </Async>
    </div>
  );
}
