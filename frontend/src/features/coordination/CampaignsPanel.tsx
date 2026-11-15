import { CalendarClock, FileSpreadsheet, Megaphone, Pencil, Plus, Search, Send, TriangleAlert, Upload, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import {
  coordApi, type Campaign, type CampaignInput, type CampaignOverview, type CampaignPreview, type CountedValue, type ImportResult,
} from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const todayIso = () => new Date().toISOString().slice(0, 10); // Dakar = GMT
const STATUS_TONE: Record<Campaign["status"], string> = {
  draft: "bg-offwhite text-navy", active: "bg-green/10 text-green", paused: "bg-gold/15 text-navy", done: "bg-navy/10 text-navy/70",
};
const ACTION_LABEL: Record<string, string> = {
  edit: "Modifier", test: "Envoyer un test", activate: "Programmer l'envoi", pause: "Mettre en pause", duplicate: "Dupliquer", delete: "Supprimer",
};
const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" }).format(new Date(iso));

type Notice = { ok: boolean; text: string } | null;
const btn = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 font-semibold transition-colors disabled:opacity-50";
const btnPrimary = `${btn} bg-green text-white hover:bg-green-2`;
const btnSecondary = `${btn} border border-navy/20 bg-white text-navy hover:bg-offwhite`;
const btnDanger = `${btn} border border-red-700/40 bg-white text-red-800 hover:bg-red-50`;

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p role="status" className={`rounded-xl border p-4 font-semibold ${notice.ok ? "border-green/30 bg-green/5 text-green" : "border-red-300 bg-red-50 text-red-900"}`}>{notice.text}</p>;
}

// ---------- Contacts ----------
function ContactsCard({ data, onChanged }: { data: CampaignOverview; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [showList, setShowList] = useState(false);
  const c = data.contacts;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setNotice(null); setResult(null);
    try { setResult(await coordApi.campaignImport(file)); onChanged(); }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };

  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="contacts-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="contacts-title" className="flex items-center gap-2 text-xl"><UsersRound className="h-5 w-5 text-green" aria-hidden />Contacts partenaires</h2>
          <p className="mt-1 text-navy/70">
            <strong className="text-navy">{c.active}</strong> contact{c.active > 1 ? "s" : ""} actif{c.active > 1 ? "s" : ""}
            {c.unsubscribed > 0 && <> · {c.unsubscribed} désinscrit{c.unsubscribed > 1 ? "s" : ""}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept=".xlsx,.csv" className="sr-only" id="contacts-file" onChange={(e) => upload(e.target.files?.[0])} />
          <label htmlFor="contacts-file" className={`${btnPrimary} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <Upload className="h-4 w-4" aria-hidden />{busy ? "Import en cours…" : "Importer un fichier Excel"}
          </label>
          {c.total > 0 && <button className={btnSecondary} onClick={() => setShowList((v) => !v)}>{showList ? "Masquer la liste" : "Voir les contacts"}</button>}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-navy/60">
        <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Première ligne du fichier : les titres des colonnes. Reconnues : <em>E-mail</em> (obligatoire), <em>Organisation</em>, <em>Nom</em>,
          {" "}<em>Segment</em>, <em>Activité</em>. Un nouvel import met à jour les contacts existants ; un contact désinscrit le reste.</span>
      </p>
      <div className="mt-4"><NoticeBox notice={notice} /></div>
      {result && (
        <div role="status" className="mt-4 rounded-xl border border-green/30 bg-green/5 p-4">
          <p className="font-semibold text-green">
            Import terminé : {result.created} ajouté{result.created > 1 ? "s" : ""}, {result.updated} mis à jour, {result.unchanged} inchangé{result.unchanged > 1 ? "s" : ""}.
          </p>
          {result.skipped_count > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-semibold text-red-900">{result.skipped_count} ligne{result.skipped_count > 1 ? "s" : ""} écartée{result.skipped_count > 1 ? "s" : ""}</summary>
              <ul className="mt-2 space-y-1">{result.skipped.map((s) => <li key={s.line}>Ligne {s.line}{s.value ? ` (${s.value})` : ""} : {s.reason}</li>)}</ul>
            </details>
          )}
        </div>
      )}
      {c.segments.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy/60">Segments</p>
          <ul className="flex flex-wrap gap-2">{c.segments.map((s) => <li key={s.value} className="rounded-full bg-offwhite px-3 py-1 text-sm">{s.value} <strong>{s.count}</strong></li>)}</ul>
        </div>
      )}
      {showList && <ContactList onChanged={onChanged} />}
    </section>
  );
}

function ContactList({ onChanged }: { onChanged: () => void }) {
  const [q, setQ] = useState("");
  const search = useDebounce(q);
  const [version, setVersion] = useState(0);
  const list = useAsync(() => coordApi.campaignContacts(search), [search, version]);
  const [notice, setNotice] = useState<Notice>(null);
  const remove = async (id: number, email: string) => {
    if (!window.confirm(`Ne plus envoyer de campagnes à ${email} ?`)) return;
    try { setNotice({ ok: true, text: await coordApi.campaignRemoveContact(id) }); setVersion((v) => v + 1); onChanged(); }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }
  };
  return (
    <div className="mt-5 border-t border-navy/10 pt-5">
      <label className="relative block">
        <span className="sr-only">Rechercher un contact</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" aria-hidden />
        <input className="field pl-9" placeholder="Rechercher : organisation, e-mail, segment…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="mt-3"><NoticeBox notice={notice} /></div>
      <Async state={list}>{(rows) => !rows.length ? <p className="mt-3 text-navy/60">Aucun contact.</p> : (
        <ul className="mt-3 divide-y divide-navy/10">{rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="font-semibold">{r.organization || r.email}</p>
              <p className="truncate text-sm text-navy/60">{[r.email, r.segment, r.activity].filter(Boolean).join(" · ")}</p>
            </div>
            {r.unsubscribed ? <span className="rounded-full bg-offwhite px-3 py-1 text-sm text-navy/60">Désinscrit</span>
              : <button className="text-sm font-semibold text-red-800 hover:underline" onClick={() => remove(r.id, r.email)}>Retirer des envois</button>}
          </li>))}
        </ul>)}
      </Async>
      <p className="mt-2 text-xs text-navy/50">100 premiers résultats affichés.</p>
    </div>
  );
}

// ---------- Éditeur ----------
const EMPTY: CampaignInput = {
  title: "", subject: "", body: "Bonjour {nom},\n\n", cta_label: "", cta_url: "", segments: [], activities: [],
  frequency: "weekly", weekday: 0, send_time: "09:00", start_date: todayIso(), end_date: "2026-12-10",
};

function Choices({ legend, options, value, onChange }: { legend: string; options: CountedValue[]; value: string[]; onChange: (v: string[]) => void }) {
  if (!options.length) return null;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{legend} <span className="font-normal text-navy/60">(aucune case cochée : tous)</span></legend>
      <div className="flex flex-wrap gap-2">{options.map((o) => (
        <label key={o.value} className={`flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${value.includes(o.value) ? "border-green bg-green/10 font-semibold text-green" : "border-navy/20 bg-white"}`}>
          <input type="checkbox" className="sr-only" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
          {o.value} <span className="text-navy/50">{o.count}</span>
        </label>))}
      </div>
    </fieldset>
  );
}

function Editor({ data, campaign, onClose, onSaved }: { data: CampaignOverview; campaign?: Campaign; onClose: () => void; onSaved: (msg: string) => void }) {
  const [v, setV] = useState<CampaignInput>(() => campaign ? {
    title: campaign.title, subject: campaign.subject, body: campaign.body, cta_label: campaign.cta_label, cta_url: campaign.cta_url,
    segments: campaign.segments, activities: campaign.activities, frequency: campaign.frequency, weekday: campaign.weekday,
    send_time: campaign.send_time.slice(0, 5), start_date: campaign.start_date, end_date: campaign.end_date,
  } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const debounced = useDebounce(v, 600);
  const set = <K extends keyof CampaignInput>(k: K, value: CampaignInput[K]) => setV((s) => ({ ...s, [k]: value }));
  const text = (k: "title" | "subject" | "body" | "cta_label" | "cta_url" | "send_time" | "start_date") =>
    (e: { target: { value: string } }) => set(k, e.target.value);

  useEffect(() => {
    let live = true;
    coordApi.campaignPreview({ ...debounced, end_date: debounced.end_date || null }).then((p) => { if (live) setPreview(p); }).catch(() => {});
    return () => { live = false; };
  }, [debounced]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const payload = { ...v, end_date: v.frequency === "once" ? null : v.end_date || null };
      await coordApi.campaignSave(payload, campaign?.id);
      onSaved(campaign ? "Campagne enregistrée." : "Campagne créée en brouillon. Envoyez-vous un test, puis programmez l'envoi.");
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const label = "mb-1 block font-semibold";
  return (
    <form onSubmit={submit} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6" aria-label="Campagne">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl">{campaign ? "Modifier la campagne" : "Nouvelle campagne"}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-offwhite" aria-label="Fermer"><X className="h-5 w-5" /></button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div><label className={label} htmlFor="c-title">Nom interne</label>
            <input id="c-title" required className="field" placeholder="Ex. Relance partenaires GWE" value={v.title} onChange={text("title")} /></div>
          <div><label className={label} htmlFor="c-subject">Objet de l'e-mail</label>
            <input id="c-subject" required maxLength={200} className="field" placeholder="Ex. Grand Week-End du Pôle : réservez les 11 et 12 décembre" value={v.subject} onChange={text("subject")} /></div>
          <div><label className={label} htmlFor="c-body">Message</label>
            <textarea id="c-body" required rows={10} className="field" value={v.body} onChange={text("body")} />
            <p className="mt-1 text-sm text-navy/60">Laissez une ligne vide entre deux paragraphes. Personnalisation : <code>{"{nom}"}</code> et <code>{"{organisation}"}</code>. Les liens (https://…) deviennent cliquables.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="c-cta">Bouton (facultatif)</label>
              <input id="c-cta" className="field" maxLength={60} placeholder="Ex. Je m'inscris" value={v.cta_label} onChange={text("cta_label")} /></div>
            <div><label className={label} htmlFor="c-url">Lien du bouton</label>
              <input id="c-url" type="url" className="field" placeholder="https://www.urbanhubconnect.com/…" value={v.cta_url} onChange={text("cta_url")} /></div>
          </div>
          <Choices legend="Segments" options={data.contacts.segments} value={v.segments} onChange={(x) => set("segments", x)} />
          <Choices legend="Activités" options={data.contacts.activities} value={v.activities} onChange={(x) => set("activities", x)} />
          <fieldset className="space-y-4 rounded-xl bg-offwhite p-4">
            <legend className="sr-only">Calendrier</legend>
            <p className="flex items-center gap-2 font-semibold"><CalendarClock className="h-5 w-5 text-green" aria-hidden />Calendrier d'envoi</p>
            <div className="flex flex-wrap gap-2">
              {([["once", "Une seule fois"], ["weekly", "Chaque semaine"], ["weekend", "Chaque week-end (samedi)"]] as const).map(([f, l]) => (
                <label key={f} className={`flex min-h-[44px] cursor-pointer items-center rounded-lg border px-4 text-sm ${v.frequency === f ? "border-green bg-white font-semibold text-green" : "border-navy/20 bg-white"}`}>
                  <input type="radio" name="frequency" className="sr-only" checked={v.frequency === f} onChange={() => set("frequency", f)} />{l}
                </label>))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {v.frequency === "weekly" && (
                <div><label className={label} htmlFor="c-day">Jour</label>
                  <select id="c-day" className="field" value={v.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>)}
              <div><label className={label} htmlFor="c-time">Heure (Dakar)</label>
                <input id="c-time" type="time" required className="field" value={v.send_time} onChange={text("send_time")} /></div>
              <div><label className={label} htmlFor="c-start">{v.frequency === "once" ? "Date d'envoi" : "À partir du"}</label>
                <input id="c-start" type="date" required className="field" value={v.start_date} onChange={text("start_date")} /></div>
              {v.frequency !== "once" && (
                <div><label className={label} htmlFor="c-end">Jusqu'au</label>
                  <input id="c-end" type="date" className="field" value={v.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} /></div>)}
            </div>
          </fieldset>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 font-semibold">Aperçu</p>
          {preview ? (
            <>
              <p className="mb-2 rounded-lg bg-offwhite px-3 py-2 text-sm"><strong>{preview.recipients}</strong> destinataire{preview.recipients > 1 ? "s" : ""}
                {preview.schedule && <> · {preview.schedule}</>}</p>
              <p className="mb-2 text-sm"><span className="text-navy/60">Objet :</span> <strong>{preview.subject || "—"}</strong></p>
              <iframe title="Aperçu de l'e-mail" srcDoc={preview.html} sandbox="" className="h-[520px] w-full rounded-xl border border-navy/15 bg-white" />
            </>
          ) : <p className="text-navy/60">Chargement de l'aperçu…</p>}
        </div>
      </div>
      {error && <p role="alert" className="mt-5 font-semibold text-red-800">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button disabled={busy} className={btnPrimary}>{busy ? "Enregistrement…" : campaign ? "Enregistrer" : "Créer la campagne"}</button>
        <button type="button" onClick={onClose} className={btnSecondary}>Annuler</button>
      </div>
    </form>
  );
}

// ---------- Liste ----------
function CampaignCard({ c, busy, onAct, onEdit }: { c: Campaign; busy: boolean; onAct: (c: Campaign, action: string) => void; onEdit: (c: Campaign) => void }) {
  return (
    <li className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{c.title}</p>
          <p className="mt-0.5 text-navy/70">{c.subject}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_TONE[c.status]}`}>{c.status_label}</span>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="inline text-navy/60">Calendrier : </dt><dd className="inline">{c.schedule}</dd></div>
        <div><dt className="inline text-navy/60">Destinataires : </dt><dd className="inline font-semibold">{c.recipients}</dd></div>
        {c.next_send && <div><dt className="inline text-navy/60">Prochain envoi : </dt><dd className="inline font-semibold text-green">{fmtDateTime(c.next_send)}</dd></div>}
        {(c.stats.sent > 0 || c.stats.failed > 0) && (
          <div><dt className="inline text-navy/60">Envoyés : </dt><dd className="inline">{c.stats.sent}{c.stats.failed > 0 && <span className="text-red-800"> · {c.stats.failed} échec{c.stats.failed > 1 ? "s" : ""}</span>}</dd></div>)}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {c.actions.map((a) => {
          const Icon = a === "edit" ? Pencil : a === "test" ? Send : a === "activate" ? CalendarClock : null;
          const cls = a === "activate" ? btnPrimary : a === "delete" ? btnDanger : btnSecondary;
          return (
            <button key={a} disabled={busy} className={cls} onClick={() => (a === "edit" ? onEdit(c) : onAct(c, a))}>
              {Icon && <Icon className="h-4 w-4" aria-hidden />}{ACTION_LABEL[a] ?? a}
            </button>);
        })}
      </div>
    </li>
  );
}

export function CampaignsPanel() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((x) => x + 1);
  const state = useAsync(coordApi.campaigns, [version]);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const act = async (c: Campaign, action: string) => {
    const data: Record<string, string> = {};
    if (action === "test") {
      const email = window.prompt("Adresse qui recevra l'e-mail de test (laissez vide pour l'adresse de votre compte) :", "");
      if (email === null) return;
      if (email.trim()) data.email = email.trim();
    }
    if (action === "activate" && !window.confirm(`Programmer « ${c.title} » ?\n\n${c.schedule}\n${c.recipients} destinataire(s).\n\nLes e-mails partiront automatiquement.`)) return;
    if (action === "delete" && !window.confirm(`Supprimer « ${c.title} » ?`)) return;
    setBusy(true); setNotice(null);
    try { setNotice({ ok: true, text: await coordApi.campaignAct(c.id, action, data) }); }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(false); refresh(); }
  };

  return (
    <Async state={state}>{(data) => (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl sm:text-3xl"><Megaphone className="h-7 w-7 text-green" aria-hidden />Campagnes d'e-mails</h1>
            <p className="mt-1 text-navy/70">Communication du Grand Week-End auprès des partenaires. Expéditeur : {data.sending.from}</p>
          </div>
          {!editing && <button className={btnPrimary} onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden />Nouvelle campagne</button>}
        </div>

        {data.sending.problem && (
          <p role="alert" className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-navy">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden /><span>{data.sending.problem}</span>
          </p>)}
        <NoticeBox notice={notice} />

        {editing ? (
          <Editor data={data} campaign={editing === "new" ? undefined : editing} onClose={() => setEditing(null)}
            onSaved={(msg) => { setEditing(null); setNotice({ ok: true, text: msg }); refresh(); }} />
        ) : (
          <>
            <ContactsCard data={data} onChanged={refresh} />
            <section aria-labelledby="campaigns-title">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="campaigns-title" className="text-xl">Campagnes</h2>
                <p className="text-sm text-navy/60">Envoyés aujourd'hui : {data.sending.sent_today} / {data.sending.daily_limit}</p>
              </div>
              {!data.campaigns.length ? (
                <p className="rounded-2xl border border-dashed border-navy/20 bg-white p-6 text-center text-navy/60">
                  Aucune campagne. {data.contacts.active ? "Créez-en une avec « Nouvelle campagne »." : "Commencez par importer votre fichier de contacts."}
                </p>
              ) : (
                <ul className="space-y-4">{data.campaigns.map((c) => <CampaignCard key={c.id} c={c} busy={busy} onAct={act} onEdit={setEditing} />)}</ul>
              )}
            </section>
          </>
        )}
      </div>
    )}</Async>
  );
}
