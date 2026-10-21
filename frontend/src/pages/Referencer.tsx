import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, CheckCircle2, FileText, Globe2, Handshake, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { FormField, fieldProps } from "../components/forms/FormField";
import { Honeypot } from "../components/forms/Honeypot";
import { Container, Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
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
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<ReferencerValues>({
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
    <>
      <PageHero title="Demande envoyée" intro="Merci de contribuer au réseau Urban Hub Connect." />
      <Section tone="offwhite">
        <div role="status" className="mx-auto max-w-2xl rounded-2xl border border-green/20 bg-white p-8 text-center shadow-soft sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green/10 text-green">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="mt-5 text-lg text-navy/80">{done}</p>
          <Link to="/annuaire" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-green px-5 font-semibold text-white transition-colors hover:bg-green-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l'annuaire
          </Link>
        </div>
      </Section>
    </>
  );

  const group = "grid gap-5 sm:grid-cols-2";
  return (
    <>
      <PageHero title="Référencer mon organisation" intro="Rejoignez l'annuaire Urban Hub Connect et faites découvrir votre activité aux acteurs de Diamniadio et du Lac Rose.">
        <Link to="/annuaire" className="inline-flex min-h-11 items-center gap-2 font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l'annuaire
        </Link>
      </PageHero>
      <Section tone="offwhite">
        <Container className="max-w-4xl !px-0">
          <div className="mb-8 flex items-start gap-4 rounded-2xl border border-gold/25 bg-gold/5 p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg">Une demande examinée par la Coordination</h2>
              <p className="mt-1 text-navy/75">Votre fiche est vérifiée avant publication. Les champs marqués d'un astérisque sont obligatoires.</p>
            </div>
          </div>
          {filters.error && <div className="mb-6"><ErrorState message={filters.error} onRetry={filters.retry} /></div>}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-6">
        <Honeypot register={register} />
        <fieldset className="space-y-5 rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-7">
          <legend className="sr-only">L'organisation</legend>
          <div className="flex items-center gap-3 border-b border-navy/10 pb-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green/10 text-green"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
            <div><h2 className="text-xl">L'organisation</h2><p className="mt-0.5 text-sm text-navy/65">Présentez votre structure et son activité.</p></div>
          </div>
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
          <FormField id="description" label="Présentation" required error={e("description")} hint={`${(watch("description") ?? "").length} / 500 caractères`}><textarea rows={5} className="field" {...fieldProps("description", e("description"))} {...register("description")} /></FormField>
          <div className="rounded-xl bg-offwhite p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy"><Globe2 className="h-4 w-4 text-purple" aria-hidden="true" />Présence en ligne</p>
            <div className={group}>
            {(["website", "linkedin", "facebook", "instagram"] as const).map((k) => (
              <FormField key={k} id={k} label={{ website: "Site web", linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram" }[k]} error={e(k)}>
                <input type="url" inputMode="url" placeholder="https://" className="field" {...fieldProps(k, e(k))} {...register(k)} /></FormField>))}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-5 rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-7">
          <legend className="sr-only">Le représentant</legend>
          <div className="flex items-center gap-3 border-b border-navy/10 pb-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple/10 text-purple"><UsersRound className="h-5 w-5" aria-hidden="true" /></span>
            <div><h2 className="text-xl">Le représentant</h2><p className="mt-0.5 text-sm text-navy/65">Personne à contacter pour le suivi de votre demande.</p></div>
          </div>
          <p className="rounded-lg bg-purple/5 px-4 py-3 text-sm text-navy/75">Ces coordonnées restent privées : elles ne sont jamais affichées publiquement.</p>
          <div className={group}>
            <FormField id="representative_name" label="Nom" required error={e("representative_name")}><input className="field" {...fieldProps("representative_name", e("representative_name"))} {...register("representative_name")} /></FormField>
            <FormField id="representative_role" label="Fonction" error={e("representative_role")}><input className="field" {...fieldProps("representative_role", e("representative_role"))} {...register("representative_role")} /></FormField>
            <FormField id="representative_phone" label="Téléphone" required error={e("representative_phone")}><input type="tel" className="field" {...fieldProps("representative_phone", e("representative_phone"))} {...register("representative_phone")} /></FormField>
            <FormField id="representative_email" label="E-mail" required error={e("representative_email")}><input type="email" className="field" {...fieldProps("representative_email", e("representative_email"))} {...register("representative_email")} /></FormField>
          </div>
        </fieldset>

        <fieldset className="space-y-5 rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-7">
          <legend className="sr-only">Offres, besoins et commissions</legend>
          <div className="flex items-center gap-3 border-b border-navy/10 pb-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold"><Handshake className="h-5 w-5" aria-hidden="true" /></span>
            <div><h2 className="text-xl">Offres, besoins et commissions</h2><p className="mt-0.5 text-sm text-navy/65">Précisez vos envies de collaboration.</p></div>
          </div>
          <p className="rounded-lg bg-gold/5 px-4 py-3 text-sm text-navy/75">Ces informations sont réservées aux membres connectés.</p>
          <FormField id="offers" label="Ce que vous proposez" error={e("offers")}><textarea rows={3} className="field" {...fieldProps("offers", e("offers"))} {...register("offers")} /></FormField>
          <FormField id="needs" label="Ce que vous recherchez" error={e("needs")}><textarea rows={3} className="field" {...fieldProps("needs", e("needs"))} {...register("needs")} /></FormField>
          <div role="group" aria-label="Commissions qui vous intéressent" className="grid gap-2 sm:grid-cols-2">
            {filters.data?.commissions.map((c) => (
              <label key={c.slug} className="flex min-h-[48px] items-center gap-3 rounded-lg border border-navy/10 px-3 py-2 transition-colors hover:border-green/40 hover:bg-green/5"><input type="checkbox" value={c.slug} className="h-5 w-5 accent-green" {...register("commissions")} />{c.name}</label>))}
          </div>
        </fieldset>

        <div className="space-y-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-7">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-green" aria-hidden="true" />Confirmation</h2>
          {([["accept_charter", "J'accepte la charte du réseau."], ["accept_privacy", "J'accepte la politique de confidentialité."]] as const).map(([k, label]) => (
            <div key={k}><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-green" {...fieldProps(k, e(k))} {...register(k)} /><span>{label} <span className="text-red-700" aria-hidden>*</span></span></label>
              {e(k) && <p id={`${k}-err`} role="alert" className="ml-8 mt-1 text-sm font-semibold text-red-700">{e(k)}</p>}</div>))}
        </div>

        {failure && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{failure}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-navy/65">Votre demande sera transmise à la Coordination pour examen.</p>
          <button disabled={isSubmitting} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-green px-8 text-lg font-semibold text-white transition-colors hover:bg-green-2 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande"}
          </button>
        </div>
      </form>
        </Container>
      </Section>
    </>
  );
}
