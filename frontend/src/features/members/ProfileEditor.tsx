import { zodResolver } from "@hookform/resolvers/zod";
import { lazy, Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { Async } from "../../components/ui/Async";
import { Loading } from "../../components/ui/States";
import { FormField, fieldProps } from "../../components/forms/FormField";
import { useAsync } from "../../hooks/useAsync";
import { memberApi, type ProfileData } from "../../services/members";
import { apiErrorMessage, applyServerErrors } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import { profileSchema, type ProfileFormValues } from "./profileSchema";

const LocationPicker = lazy(() => import("../map/LocationPicker"));
const MAX_MB = 5, TYPES = ["image/jpeg", "image/png", "image/webp"];

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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-1 text-xl font-bold">Partie publique de la fiche</legend>
        <p className="text-navy/80 sm:col-span-2">Ces informations sont visibles dans l'Annuaire. Vos modifications sont mises en ligne après validation par la Coordination ; la fiche actuelle reste affichée en attendant.</p>
        {area("description", "Présentation", 5, `${description.length} / 500 caractères`)}
        {text("website", "Site web", { type: "url" })}{text("linkedin", "LinkedIn", { type: "url" })}
        {text("facebook", "Facebook", { type: "url" })}{text("instagram", "Instagram", { type: "url" })}
        {text("neighborhood", "Quartier")}{text("address", "Adresse")}
        <div className="sm:col-span-2">
          <p className="mb-1.5 font-semibold">Point sur la Cartographie <span className="font-normal text-navy/65">(cliquez pour placer ou déplacer le point)</span></p>
          <Suspense fallback={<Loading label="Chargement de la carte…" />}>
            <LocationPicker value={point} onPick={(a, b) => { setValue("latitude", a.toFixed(6)); setValue("longitude", b.toFixed(6)); }} />
          </Suspense>
          <p className="mt-2 text-sm text-navy/75" aria-live="polite">{point ? `Point : ${lat}, ${lng}` : "Aucun point choisi."}
            {point && <> · <button type="button" className="link" onClick={() => { setValue("latitude", ""); setValue("longitude", ""); }}>Retirer le point</button></>}</p>
          {e("longitude") && <p role="alert" className="text-sm font-semibold text-red-700">{e("longitude")}</p>}
          {e("latitude") && <p role="alert" className="text-sm font-semibold text-red-700">{e("latitude")}</p>}
        </div>
        <FormField id="p-logo" label="Logo" hint="JPG, PNG ou WebP, 5 Mo maximum. Le nouveau logo est validé avant mise en ligne." error={logoError} className="sm:col-span-2">
          {org.logo && <img src={org.logo} alt={`Logo actuel de ${org.name}`} className="mb-3 h-16 w-auto rounded border border-navy/10 bg-white p-1" />}
          <input type="file" accept={TYPES.join(",")} className="field" {...fieldProps("p-logo", logoError)} onChange={(ev) => onLogo(ev.target.files?.[0])} /></FormField>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-1 text-xl font-bold">Informations réservées aux membres</legend>
        <p className="text-navy/80 sm:col-span-2">Visibles uniquement des membres à jour ; enregistrées immédiatement.</p>
        {text("representative_name", "Nom du représentant")}{text("representative_role", "Fonction")}
        {text("representative_phone", "Téléphone direct", { type: "tel" })}{text("representative_email", "E-mail direct", { type: "email" })}
        {text("phone", "Téléphone de l'organisation", { type: "tel" })}{text("email", "E-mail de l'organisation", { type: "email" })}
        {area("offers", "Ce que nous proposons")}{area("needs", "Ce que nous recherchons")}
      </fieldset>

      {failure && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{failure}</p>}
      <button disabled={isSubmitting} className="min-h-[48px] rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{isSubmitting ? "Enregistrement…" : "Enregistrer"}</button>
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
    <Async state={state}>
      {(p) => (
        <div className="space-y-8">
          <h2 className="text-2xl">Mon profil</h2>
          <p role="status" aria-live="polite" className={`min-h-[1.5rem] font-semibold ${notice?.ok ? "text-green" : "text-red-800"}`}>{notice?.text}</p>
          {p.pending && (
            <p className="rounded-md border border-gold bg-gold/10 p-4">
              <strong>Modification en attente de validation</strong> depuis le {fmtDate(p.pending.since)} : {p.pending.fields.join(", ")}.
              La fiche publiée ne change pas avant la validation de la Coordination.</p>)}
          {!p.organization ? (
            <p className="rounded-md border border-navy/15 bg-offwhite p-5 text-lg">Aucune fiche n'est liée à votre adhésion. Contactez la Coordination pour en créer ou en rattacher une.</p>
          ) : (
            <>
              <section aria-label="Visibilité de la fiche" className="rounded-md border border-navy/15 bg-offwhite p-5">
                <h3 className="text-lg">Visibilité dans l'Annuaire</h3>
                {!p.listing.public_listing ? <p className="mt-2">Votre catégorie d'adhésion ne comporte pas de fiche publique.</p> : (
                  <>
                    <p className="mt-2">{p.listing.published ? "Votre fiche est visible dans l'Annuaire." : p.listing.hidden_by_member ? "Vous avez retiré votre fiche de l'Annuaire." : "Votre fiche n'est pas encore publiée."}</p>
                    {p.listing.published && <button disabled={busy} onClick={() => listing("hide")} className="mt-3 min-h-[44px] rounded-md border border-red-700 px-5 font-semibold text-red-800 hover:bg-red-50">Retirer ma fiche de l'Annuaire</button>}
                    {!p.listing.published && p.listing.hidden_by_member && <button disabled={busy} onClick={() => listing("show")} className="mt-3 min-h-[44px] rounded-md bg-green px-5 font-semibold text-white hover:bg-green-2">Remettre ma fiche en ligne</button>}
                  </>)}
              </section>
              <ProfileForm key={version} profile={p} onSaved={(text) => { setNotice({ ok: true, text }); setVersion((v) => v + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </>)}
        </div>)}
    </Async>
  );
}
