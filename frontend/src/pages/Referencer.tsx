import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { FormField, fieldProps } from "../components/forms/FormField";
import { Honeypot } from "../components/forms/Honeypot";
import { Section } from "../components/ui/Container";
import { ErrorState } from "../components/ui/States";
import { referencerSchema, type ReferencerValues } from "../features/directory/referencerSchema";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getOrganizationFilters, submitMultipart } from "../services/api";
import { apiErrorMessage, applyServerErrors } from "../utils/errors";

const MAX_LOGO_MB = 5;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function Referencer() {
  useSeo("Référencer mon organisation", "Demandez le référencement de votre organisation dans l'annuaire du réseau Urban Hub Connect.");
  const filters = useAsync(getOrganizationFilters);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ReferencerValues>({
    resolver: zodResolver(referencerSchema), defaultValues: { commissions: [] } });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const [done, setDone] = useState("");
  const [failure, setFailure] = useState("");
  const e = (k: keyof ReferencerValues) => errors[k]?.message as string | undefined;

  const onLogo = (f: File | undefined) => {
    setLogoError("");
    if (!f) return setLogo(null);
    if (!LOGO_TYPES.includes(f.type)) { setLogo(null); return setLogoError("Format accepté : JPG, PNG ou WebP."); }
    if (f.size > MAX_LOGO_MB * 1024 * 1024) { setLogo(null); return setLogoError(`Le logo ne doit pas dépasser ${MAX_LOGO_MB} Mo.`); }
    setLogo(f);
  };

  const onSubmit = async (v: ReferencerValues) => {
    setFailure("");
    const body = new FormData();
    Object.entries(v).forEach(([k, val]) => {
      if (k === "commissions") (val as string[]).forEach((c) => body.append("commissions", c));
      else if (typeof val === "boolean") body.append(k, String(val));
      else if (val !== "" && val !== undefined) body.append(k, String(val));
    });
    if (logo) body.append("logo", logo);
    try { setDone(await submitMultipart("/organizations/submit/", body)); window.scrollTo({ top: 0 }); }
    catch (err) { if (!applyServerErrors(err, setError as never)) setFailure(apiErrorMessage(err)); }
  };

  if (done) return (
    <Section><div role="status" className="max-w-2xl rounded-md border border-green/40 bg-green/5 p-6 text-lg">
      <p>{done}</p><Link to="/annuaire" className="link mt-4 inline-block font-semibold">Retour à l'annuaire</Link></div></Section>
  );

  const group = "grid gap-5 sm:grid-cols-2";
  return (
    <Section>
      <h1 className="text-3xl sm:text-5xl">Référencer mon organisation</h1>
      <p className="mt-3 max-w-2xl text-lg text-navy/75">Votre fiche est examinée par la Coordination avant publication. Les champs marqués d'un astérisque sont obligatoires.</p>
      {filters.error && <div className="mt-6"><ErrorState message={filters.error} onRetry={filters.retry} /></div>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative mt-10 max-w-3xl space-y-10">
        <Honeypot register={register} />
        <fieldset className="space-y-5"><legend className="mb-2 text-xl font-bold">L'organisation</legend>
          <FormField id="name" label="Nom de l'organisation" required error={e("name")}><input className="field" {...fieldProps("name", e("name"))} {...register("name")} /></FormField>
          <FormField id="logo" label="Logo" hint="JPG, PNG ou WebP, 5 Mo maximum." error={logoError}>
            <input type="file" accept={LOGO_TYPES.join(",")} className="field" {...fieldProps("logo", logoError)} onChange={(ev) => onLogo(ev.target.files?.[0])} /></FormField>
          <div className={group}>
            <FormField id="college" label="Collège" required error={e("college")}><select className="field" {...fieldProps("college", e("college"))} {...register("college")}>
              <option value="">Choisir…</option>{filters.data?.colleges.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></FormField>
            <FormField id="sector" label="Secteur" required error={e("sector")}><select className="field" {...fieldProps("sector", e("sector"))} {...register("sector")}>
              <option value="">Choisir…</option>{filters.data?.sectors.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></FormField>
            <FormField id="pole" label="Pôle" required error={e("pole")}><select className="field" {...fieldProps("pole", e("pole"))} {...register("pole")}>
              <option value="">Choisir…</option>{filters.data?.poles.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></FormField>
            <FormField id="neighborhood" label="Quartier" error={e("neighborhood")}><input className="field" {...fieldProps("neighborhood", e("neighborhood"))} {...register("neighborhood")} /></FormField>
          </div>
          <FormField id="address" label="Adresse" error={e("address")}><input className="field" {...fieldProps("address", e("address"))} {...register("address")} /></FormField>
          <div className={group}>
            <FormField id="latitude" label="Latitude" hint="Exemple : 14.7167" error={e("latitude")}><input inputMode="decimal" className="field" {...fieldProps("latitude", e("latitude"))} {...register("latitude")} /></FormField>
            <FormField id="longitude" label="Longitude" hint="Exemple : -17.1833" error={e("longitude")}><input inputMode="decimal" className="field" {...fieldProps("longitude", e("longitude"))} {...register("longitude")} /></FormField>
          </div>
          <FormField id="description" label="Présentation" required error={e("description")}><textarea rows={5} className="field" {...fieldProps("description", e("description"))} {...register("description")} /></FormField>
          <div className={group}>
            {(["website", "linkedin", "facebook", "instagram"] as const).map((k) => (
              <FormField key={k} id={k} label={{ website: "Site web", linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram" }[k]} error={e(k)}>
                <input type="url" inputMode="url" placeholder="https://" className="field" {...fieldProps(k, e(k))} {...register(k)} /></FormField>))}
          </div>
        </fieldset>

        <fieldset className="space-y-5"><legend className="mb-1 text-xl font-bold">Le représentant</legend>
          <p className="text-navy/75">Ces coordonnées restent privées : elles ne sont jamais affichées publiquement.</p>
          <div className={group}>
            <FormField id="representative_name" label="Nom" required error={e("representative_name")}><input className="field" {...fieldProps("representative_name", e("representative_name"))} {...register("representative_name")} /></FormField>
            <FormField id="representative_role" label="Fonction" error={e("representative_role")}><input className="field" {...fieldProps("representative_role", e("representative_role"))} {...register("representative_role")} /></FormField>
            <FormField id="representative_phone" label="Téléphone" required error={e("representative_phone")}><input type="tel" className="field" {...fieldProps("representative_phone", e("representative_phone"))} {...register("representative_phone")} /></FormField>
            <FormField id="representative_email" label="E-mail" required error={e("representative_email")}><input type="email" className="field" {...fieldProps("representative_email", e("representative_email"))} {...register("representative_email")} /></FormField>
          </div>
        </fieldset>

        <fieldset className="space-y-5"><legend className="mb-1 text-xl font-bold">Offres, besoins et commissions</legend>
          <p className="text-navy/75">Ces informations sont réservées aux membres connectés.</p>
          <FormField id="offers" label="Ce que vous proposez" error={e("offers")}><textarea rows={3} className="field" {...fieldProps("offers", e("offers"))} {...register("offers")} /></FormField>
          <FormField id="needs" label="Ce que vous recherchez" error={e("needs")}><textarea rows={3} className="field" {...fieldProps("needs", e("needs"))} {...register("needs")} /></FormField>
          <div role="group" aria-label="Commissions qui vous intéressent" className="grid gap-2 sm:grid-cols-2">
            {filters.data?.commissions.map((c) => (
              <label key={c.slug} className="flex min-h-[44px] items-center gap-3"><input type="checkbox" value={c.slug} className="h-5 w-5 accent-green" {...register("commissions")} />{c.name}</label>))}
          </div>
        </fieldset>

        <div className="space-y-3">
          {([["accept_charter", "J'accepte la charte du réseau."], ["accept_privacy", "J'accepte la politique de confidentialité."]] as const).map(([k, label]) => (
            <div key={k}><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-green" {...fieldProps(k, e(k))} {...register(k)} /><span>{label} <span className="text-red-700" aria-hidden>*</span></span></label>
              {e(k) && <p id={`${k}-err`} role="alert" className="ml-8 mt-1 text-sm font-semibold text-red-700">{e(k)}</p>}</div>))}
        </div>

        {failure && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{failure}</p>}
        <button disabled={isSubmitting} className="inline-flex min-h-[48px] items-center rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">
          {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande"}
        </button>
      </form>
    </Section>
  );
}
