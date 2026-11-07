import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3, Eye, EyeOff, Globe2, LockKeyhole, Save, UserRound } from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Async } from "../../components/ui/Async";
import { Loading } from "../../components/ui/States";
import { FormField, fieldProps } from "../../components/forms/FormField";
import { useAsync } from "../../hooks/useAsync";
import { memberApi, type ProfileData } from "../../services/members";
import { apiErrorMessage, applyServerErrors } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import { profileSchema, type ProfileFormValues } from "./profileSchema";
import { Badge, Card, Notice, PanelHeader, dangerBtn, primaryBtn } from "./ui";

const LocationPicker = lazy(() => import("../map/LocationPicker"));
const MAX_MB = 5, TYPES = ["image/jpeg", "image/png", "image/webp"];

const SectionTitle = ({ icon: Icon, iconClass, title, badge }: { icon: typeof Globe2; iconClass: string; title: string; badge: ReactNode }) => (
  <div className="mb-1 flex flex-wrap items-center gap-2 sm:col-span-2">
    <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden /><h3 className="font-heading text-xl font-bold">{title}</h3>{badge}
  </div>
);

function ProfileForm({ profile, onSaved }: { profile: ProfileData; onSaved: (message: string) => void }) {
  const org = profile.organization!;
  const { register, handleSubmit, setValue, setError, watch, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ...org, latitude: org.latitude ?? "", longitude: org.longitude ?? "" } as ProfileFormValues,
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [failure, setFailure] = useState("");
  const lat = watch("latitude"), lng = watch("longitude"), description = watch("description") ?? "";
  const point: [number, number] | null = lat && lng ? [Number(lat), Number(lng)] : null;
  const e = (k: keyof ProfileFormValues) => errors[k]?.message as string | undefined;

  const onLogo = (f?: File) => {
    setLogoError("");
    if (!f) return setLogo(null);
    if (!TYPES.includes(f.type)) { setLogo(null); return setLogoError("Format accepté : JPG, PNG ou WebP."); }
    if (f.size > MAX_MB * 1024 * 1024) { setLogo(null); return setLogoError(`Le logo ne doit pas dépasser ${MAX_MB} Mo.`); }
    setLogo(f);
  };
  const onSubmit = async (v: ProfileFormValues) => {
    setFailure("");
    const body = new FormData();
    Object.entries(v).forEach(([k, val]) => body.append(k, String(val ?? "")));
    if (logo) body.append("logo", logo);
    try { onSaved((await memberApi.saveProfile(body)).detail); }
    catch (err) { if (!applyServerErrors(err, setError as never)) setFailure(apiErrorMessage(err)); }
  };
  const text = (id: keyof ProfileFormValues, label: string, extra: { type?: string; hint?: string; wide?: boolean } = {}) => (
    <FormField id={`p-${id}`} label={label} hint={extra.hint} error={e(id)} className={extra.wide ? "sm:col-span-2" : ""}>
      <input type={extra.type ?? "text"} className="field" {...fieldProps(`p-${id}`, e(id))} {...register(id)} /></FormField>);
  const area = (id: keyof ProfileFormValues, label: string, rows = 4, hint?: string) => (
    <FormField id={`p-${id}`} label={label} hint={hint} error={e(id)} className="sm:col-span-2">
      <textarea rows={rows} className="field" {...fieldProps(`p-${id}`, e(id))} {...register(id)} /></FormField>);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">Partie publique de la fiche</legend>
          <SectionTitle icon={Globe2} iconClass="text-green" title="Partie publique de la fiche" badge={<Badge tone="gold">Validée par la Coordination</Badge>} />
          <p className="-mt-2 text-navy/75 sm:col-span-2">Visible de tous dans l'Annuaire. Vos modifications sont mises en ligne après validation ; la fiche actuelle reste affichée en attendant.</p>
          {area("description", "Présentation", 5, `${description.length} / 500 caractères`)}
          {text("website", "Site web", { type: "url" })}{text("linkedin", "LinkedIn", { type: "url" })}
          {text("facebook", "Facebook", { type: "url" })}{text("instagram", "Instagram", { type: "url" })}
          {text("neighborhood", "Quartier")}{text("address", "Adresse")}
          <div className="sm:col-span-2">
            <p className="mb-1.5 font-semibold">Point sur la Cartographie <span className="font-normal text-navy/65">(touchez la carte pour placer ou déplacer le point)</span></p>
            <div className="overflow-hidden rounded-xl border border-navy/10">
              <Suspense fallback={<Loading label="Chargement de la carte…" />}>
                <LocationPicker value={point} onPick={(a, b) => { setValue("latitude", a.toFixed(6)); setValue("longitude", b.toFixed(6)); }} />
              </Suspense>
            </div>
            <p className="mt-2 text-sm text-navy/75" aria-live="polite">{point ? `Point : ${lat}, ${lng}` : "Aucun point choisi."}
              {point && <> · <button type="button" className="link" onClick={() => { setValue("latitude", ""); setValue("longitude", ""); }}>Retirer le point</button></>}</p>
            {e("longitude") && <p role="alert" className="text-sm font-semibold text-red-700">{e("longitude")}</p>}
            {e("latitude") && <p role="alert" className="text-sm font-semibold text-red-700">{e("latitude")}</p>}
          </div>
          <FormField id="p-logo" label="Logo" hint="JPG, PNG ou WebP, 5 Mo maximum. Le nouveau logo est validé avant mise en ligne." error={logoError} className="sm:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {org.logo && <img src={org.logo} alt={`Logo actuel de ${org.name}`} className="h-16 w-16 shrink-0 rounded-xl border border-navy/10 bg-white object-contain p-1" />}
              <input type="file" accept={TYPES.join(",")} className="field" {...fieldProps("p-logo", logoError)} onChange={(ev) => onLogo(ev.target.files?.[0])} />
            </div></FormField>
        </fieldset>
      </Card>

      <Card>
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">Informations réservées aux membres</legend>
          <SectionTitle icon={LockKeyhole} iconClass="text-purple" title="Réservé aux membres" badge={<Badge tone="green">Enregistré tout de suite</Badge>} />
          <p className="-mt-2 text-navy/75 sm:col-span-2">Visible uniquement des membres à jour, dans l'annuaire complet.</p>
          {text("representative_name", "Nom du représentant")}{text("representative_role", "Fonction")}
          {text("representative_phone", "Téléphone direct", { type: "tel" })}{text("representative_email", "E-mail direct", { type: "email" })}
          {text("phone", "Téléphone de l'organisation", { type: "tel" })}{text("email", "E-mail de l'organisation", { type: "email" })}
          {area("offers", "Ce que nous proposons")}{area("needs", "Ce que nous recherchons")}
        </fieldset>
      </Card>

      {failure && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{failure}</p>}
      {/* Barre d'enregistrement toujours visible ; sur mobile, la place du bouton WhatsApp (en bas à droite) reste libre. */}
      <div className="sticky bottom-3 z-20 mr-16 rounded-2xl border border-navy/10 bg-white/95 p-2 shadow-lg backdrop-blur sm:mr-0 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-3">
        <p className="hidden px-2 text-sm text-navy/70 sm:block">Les informations privées sont enregistrées tout de suite, la partie publique après validation.</p>
        <button disabled={isSubmitting} className={`${primaryBtn} w-full shrink-0 text-lg sm:w-auto sm:px-8`}><Save className="h-5 w-5" aria-hidden />{isSubmitting ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}

export function ProfileEditor() {
  const [version, setVersion] = useState(0);
  const state = useAsync(memberApi.profile, [version]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const listing = async (action: "hide" | "show") => {
    if (action === "hide" && !window.confirm("Retirer votre fiche de l'Annuaire ? Vous pourrez la remettre en ligne à tout moment.")) return;
    setBusy(true); setNotice(null);
    try { setNotice({ ok: true, text: (await memberApi.listing(action)).detail }); setVersion((v) => v + 1); }
    catch (err) { setNotice({ ok: false, text: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <PanelHeader icon={UserRound} title="Mon profil" intro="Votre fiche dans l'Annuaire et les informations visibles des autres membres." />
      <Notice notice={notice} />
      <Async state={state}>
        {(p) => (
          <div className="space-y-6">
            {p.pending && (
              <p className="flex gap-3 rounded-xl border border-gold/50 bg-gold/10 p-4">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
                <span><strong>Modification en attente de validation</strong> depuis le {fmtDate(p.pending.since)} : {p.pending.fields.join(", ")}.
                  La fiche publiée ne change pas avant la validation de la Coordination.</span></p>)}
            {!p.organization ? (
              <Card><p className="text-lg">Aucune fiche n'est liée à votre adhésion. Contactez la Coordination pour en créer ou en rattacher une.</p></Card>
            ) : (
              <>
                <Card aria-label="Visibilité de la fiche">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.listing.published ? "bg-green/10 text-green" : "bg-navy/5 text-navy/60"}`}>
                        {p.listing.published ? <Eye className="h-5 w-5" aria-hidden /> : <EyeOff className="h-5 w-5" aria-hidden />}</span>
                      <div>
                        <h3 className="font-heading text-lg font-bold">Visibilité dans l'Annuaire</h3>
                        <p className="mt-0.5 text-navy/75">{!p.listing.public_listing ? "Votre catégorie d'adhésion ne comporte pas de fiche publique."
                          : p.listing.published ? "Votre fiche est visible dans l'Annuaire."
                          : p.listing.hidden_by_member ? "Vous avez retiré votre fiche de l'Annuaire." : "Votre fiche n'est pas encore publiée."}</p>
                      </div>
                    </div>
                    {p.listing.public_listing && p.listing.published && <button disabled={busy} onClick={() => listing("hide")} className={`${dangerBtn} w-full sm:w-auto`}>Retirer ma fiche de l'Annuaire</button>}
                    {p.listing.public_listing && !p.listing.published && p.listing.hidden_by_member && <button disabled={busy} onClick={() => listing("show")} className={`${primaryBtn} w-full sm:w-auto`}>Remettre ma fiche en ligne</button>}
                  </div>
                </Card>
                <ProfileForm key={version} profile={p} onSaved={(text) => { setNotice({ ok: true, text }); setVersion((v) => v + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </>)}
          </div>)}
      </Async>
    </div>
  );
}
