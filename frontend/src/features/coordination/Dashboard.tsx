import { ArrowRight, CheckCircle2, Megaphone, Printer, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type Me } from "../../services/coordination";
import type { Tab } from "./CoordinationApp";
import { kindIcon, PageHeader, Panel } from "./ui";

const today = () => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Dakar" }).format(new Date());
// Files de suivi (pas des demandes en attente) : affichées à part, sans alerte.
const FOLLOW_UP = ["members", "suspended"];

export function Dashboard({ me, version, onOpen, onGo }: { me: Me; version: number; onOpen: (kind: string) => void; onGo: (t: Tab) => void }) {
  const state = useAsync(coordApi.summary, [version]);
  const first = me.name.split(/\s+/)[0];
  const quick = "flex min-h-[56px] items-center gap-3 rounded-xl border border-navy/10 bg-white px-4 font-semibold shadow-soft transition-colors hover:border-green/40 hover:bg-green/5";

  return (
    <Async state={state}>
      {(d) => {
        const pending = d.queues.filter((q) => q.count > 0 && !FOLLOW_UP.includes(q.kind)).sort((a, b) => b.count - a.count);
        const followUp = d.queues.filter((q) => FOLLOW_UP.includes(q.kind));
        const clear = d.queues.filter((q) => q.count === 0 && !FOLLOW_UP.includes(q.kind));
        return (
          <div className="space-y-6">
            <PageHeader title={`Bonjour ${first}`} description={<span className="first-letter:uppercase">{today()}</span>} />

            {/* État du jour */}
            {d.to_handle === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-green/25 bg-green/5 p-5">
                <CheckCircle2 className="h-8 w-8 shrink-0 text-green" aria-hidden />
                <div><p className="font-heading text-xl font-bold text-green">Tout est à jour</p><p className="text-navy/70">Aucune demande en attente.</p></div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-2xl bg-navy p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="font-heading text-3xl font-extrabold">{d.to_handle}</p>
                  <p className="text-white/80">demande{d.to_handle > 1 ? "s" : ""} en attente de traitement</p>
                </div>
                {pending[0] && (
                  <button onClick={() => onOpen(pending[0].kind)}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold px-5 font-semibold text-navy hover:bg-gold-light">
                    Commencer : {pending[0].label}<ArrowRight className="h-4 w-4" aria-hidden /></button>)}
              </div>
            )}

            {/* Raccourcis */}
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => onGo("checkin")} className={quick}><ScanLine className="h-5 w-5 text-green" aria-hidden />Scanner un badge</button>
              <Link to="/coordination/badges?nouveaux=1" className={quick}><Printer className="h-5 w-5 text-green" aria-hidden />Imprimer les badges</Link>
              <button onClick={() => onGo("campaigns")} className={quick}><Megaphone className="h-5 w-5 text-green" aria-hidden />Campagnes d'e-mails</button>
            </div>

            {/* Demandes en attente */}
            {!!pending.length && (
              <Panel title="En attente">
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pending.map((q) => {
                    const Icon = kindIcon(q.kind);
                    return (
                      <li key={q.kind}>
                        <button onClick={() => onOpen(q.kind)}
                          className="group flex w-full items-center gap-3 rounded-xl border border-gold/40 bg-gold/5 p-4 text-left transition-colors hover:bg-gold/15">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-navy shadow-sm"><Icon className="h-5 w-5" aria-hidden /></span>
                          <span className="min-w-0 flex-1 font-semibold leading-snug">{q.label}</span>
                          <span className="font-heading text-2xl font-extrabold text-navy">{q.count}</span>
                        </button>
                      </li>);
                  })}
                </ul>
              </Panel>)}

            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              {/* Chiffres */}
              <Panel title="Le réseau en chiffres">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {d.stats.map((s) => (
                    <div key={s.label} className="rounded-xl bg-offwhite p-4">
                      <dd className="font-heading text-2xl font-extrabold text-navy sm:text-3xl">{s.value}</dd>
                      <dt className="mt-1 text-sm leading-snug text-navy/70">{s.label}</dt>
                    </div>))}
                </dl>
              </Panel>

              {/* Suivi et files à jour */}
              <Panel title="Suivi">
                <ul className="divide-y divide-navy/10">
                  {[...followUp, ...clear].map((q) => {
                    const Icon = kindIcon(q.kind);
                    return (
                      <li key={q.kind}>
                        <button onClick={() => onOpen(q.kind)} className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-green">
                          <Icon className="h-4 w-4 shrink-0 text-navy/50" aria-hidden />
                          <span className="flex-1">{q.label}</span>
                          <span className={`font-semibold ${q.count ? "text-navy" : "text-navy/40"}`}>{q.count}</span>
                        </button>
                      </li>);
                  })}
                </ul>
              </Panel>
            </div>
          </div>
        );
      }}
    </Async>
  );
}
