import { Trash2, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { ErrorMessage, SuccessMessage } from "../components/forms/FormMessage";
import { Container } from "../components/ui/Container";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { addGuest, getGuests, removeGuest, type GuestState } from "../services/api";
import { apiErrorMessage } from "../utils/errors";
import { NotFound } from "./ErrorPage";

const EMPTY = { name: "", job_title: "", organization: "", email: "" };

/** Lien personnel d'un contact (table du Gala, partenaire, délégation) : il désigne ses invités dans la limite du quota.
 *  Chaque invité reçoit un badge nominatif. Page non référencée. */
export default function Invites() {
  const { token = "" } = useParams();
  useSeo("Mes invités – Grand Week-End du Pôle", "Désignez vos invités.", undefined, true);
  const q = useAsync(() => getGuests(token), [token]);
  const [state, setState] = useState<GuestState | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  if (q.notFound) return <NotFound />;
  if (q.loading) return <Loading />;
  const d = state ?? q.data;
  if (!d) return <Container className="py-16"><ErrorState message={q.error ?? "Lien indisponible."} onRetry={q.retry} /></Container>;

  const act = async (fn: () => Promise<GuestState & { detail: string }>) => {
    setBusy(true); setNotice(null);
    try { const r = await fn(); setState(r); setNotice({ ok: true, text: r.detail }); return true; }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); return false; }
    finally { setBusy(false); }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setNotice({ ok: false, text: "Indiquez le prénom et le nom de l'invité." });
    if (await act(() => addGuest(token, form))) setForm(EMPTY);
  };
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="bg-offwhite py-10 sm:py-14">
      <Container className="max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green">Grand Week-End du Pôle · {d.kind}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Mes invités</h1>
          <p className="mt-3 text-navy/75">{d.organization || d.holder} : {d.quota} accréditation{d.quota > 1 ? "s" : ""}, dont <strong>{d.remaining}</strong> encore à attribuer.
            Chaque invité reçoit un badge nominatif valable pour les deux journées{d.gala ? ", avec l'accès au Gala du Pôle" : " (sans accès au Gala)"}.</p>
        </header>
        {notice && (notice.ok ? <SuccessMessage>{notice.text}</SuccessMessage> : <ErrorMessage>{notice.text}</ErrorMessage>)}

        <section className="card p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-xl"><Users className="h-5 w-5 text-green" aria-hidden />Invités désignés ({d.guests.length})</h2>
          {!d.guests.length ? <p className="mt-3 text-navy/65">Aucun invité pour le moment.</p> : (
            <ul className="mt-3 divide-y divide-navy/10">{d.guests.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-semibold">{g.name} <span className="text-sm font-normal text-navy/60">{g.reference}</span></p>
                  <p className="text-sm text-navy/70">{[g.job_title, g.organization].filter(Boolean).join(" · ")}{g.badge_sent ? " · badge envoyé" : ""}</p></div>
                <button disabled={busy} onClick={() => window.confirm(`Retirer ${g.name} ? Son badge ne sera plus valable.`) && act(() => removeGuest(token, g.id))}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-300 px-4 font-semibold text-red-800 disabled:opacity-60">
                  <Trash2 className="h-4 w-4" aria-hidden />Retirer</button>
              </li>))}</ul>)}
        </section>

        {d.remaining > 0 && (
          <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
            <h2 className="flex items-center gap-2 text-xl sm:col-span-2"><UserPlus className="h-5 w-5 text-green" aria-hidden />Ajouter un invité</h2>
            <div><label htmlFor="g-name" className="mb-1.5 block font-semibold">Prénom et nom *</label><input id="g-name" className="field" value={form.name} onChange={set("name")} /></div>
            <div><label htmlFor="g-job" className="mb-1.5 block font-semibold">Fonction</label><input id="g-job" className="field" value={form.job_title} onChange={set("job_title")} /></div>
            <div><label htmlFor="g-org" className="mb-1.5 block font-semibold">Organisation</label><input id="g-org" className="field" value={form.organization} onChange={set("organization")} placeholder={d.organization} /></div>
            <div><label htmlFor="g-mail" className="mb-1.5 block font-semibold">E-mail de l'invité</label><input id="g-mail" type="email" className="field" value={form.email} onChange={set("email")} />
              <p className="mt-1 text-sm text-navy/60">Facultatif : sans adresse, le badge vous est envoyé.</p></div>
            <div className="sm:col-span-2"><button disabled={busy} className="min-h-[48px] rounded-lg bg-green px-6 font-semibold text-white hover:bg-green-2 disabled:opacity-60">Ajouter et envoyer le badge</button></div>
          </form>)}
      </Container>
    </div>
  );
}
