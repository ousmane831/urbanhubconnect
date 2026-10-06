import { zodResolver } from "@hookform/resolvers/zod";
import { lazy, Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField, fieldProps } from "../../components/forms/FormField";
import { Honeypot } from "../../components/forms/Honeypot";
import { Loading } from "../../components/ui/States";
import { useAsync } from "../../hooks/useAsync";
import { getMapCategories, submitMultipart } from "../../services/api";
import { apiErrorMessage, applyServerErrors } from "../../utils/errors";

const LocationPicker = lazy(() => import("./LocationPicker"));
const MAX_MB = 5, TYPES = ["image/jpeg", "image/png", "image/webp"];

export const proposeSchema = z.object({
  name: z.string().trim().min(2, "Indiquez le nom du lieu."),
  category: z.string().min(1, "Choisissez une catégorie."),
  address: z.string().trim().max(255),
  latitude: z.string(), longitude: z.string(),
  phone: z.string().trim().max(30),
  email: z.string().trim().email("Cette adresse e-mail n'est pas valide.").or(z.literal("")),
  opening_hours: z.string().trim().max(255),
  submitter_name: z.string().trim().min(2, "Indiquez votre nom."),
  submitter_email: z.string().trim().min(1, "Indiquez votre e-mail.").email("Cette adresse e-mail n'est pas valide."),
  company_website: z.string().optional(),
}).refine((v) => v.address !== "" || v.latitude !== "", { path: ["address"], message: "Indiquez une adresse ou placez un point sur la carte." });
type Values = z.infer<typeof proposeSchema>;

export default function ProposePlaceForm() {
  const cats = useAsync(getMapCategories);
  const { register, handleSubmit, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(proposeSchema), defaultValues: { latitude: "", longitude: "" } });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [done, setDone] = useState("");
  const [failure, setFailure] = useState("");
  const lat = watch("latitude"), lng = watch("longitude");
  const point: [number, number] | null = lat && lng ? [Number(lat), Number(lng)] : null;
  const e = (k: keyof Values) => errors[k]?.message as string | undefined;

  const onPhoto = (f?: File) => {
    setPhotoError("");
    if (!f) return setPhoto(null);
    if (!TYPES.includes(f.type)) { setPhoto(null); return setPhotoError("Format accepté : JPG, PNG ou WebP."); }
    if (f.size > MAX_MB * 1024 * 1024) { setPhoto(null); return setPhotoError(`La photo ne doit pas dépasser ${MAX_MB} Mo.`); }
    setPhoto(f);
  };
  const onSubmit = async (v: Values) => {
    setFailure("");
    const body = new FormData();
    Object.entries(v).forEach(([k, val]) => { if (val !== "" && val !== undefined) body.append(k, String(val)); });
    if (photo) body.append("photo", photo);
    try { setDone(await submitMultipart("/map/suggest/", body)); }
    catch (err) { if (!applyServerErrors(err, setError as never)) setFailure(apiErrorMessage(err)); }
  };

  if (done) return <p role="status" className="rounded-md border border-green/40 bg-green/5 p-5 text-lg">{done}</p>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative grid max-w-3xl gap-5 sm:grid-cols-2">
      <Honeypot register={register} />
      <FormField id="pl-name" label="Nom du lieu" required error={e("name")}><input className="field" {...fieldProps("pl-name", e("name"))} {...register("name")} /></FormField>
      <FormField id="pl-cat" label="Catégorie" required error={e("category")}>
        <select className="field" {...fieldProps("pl-cat", e("category"))} {...register("category")}><option value="">Choisir…</option>
          {cats.data?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></FormField>
      <FormField id="pl-addr" label="Adresse" hint="Ou placez le point sur la carte ci-dessous." error={e("address")} className="sm:col-span-2">
        <input className="field" {...fieldProps("pl-addr", e("address"))} {...register("address")} /></FormField>
      <div className="sm:col-span-2">
        <p className="mb-1.5 font-semibold">Point sur la carte <span className="font-normal text-navy/65">(cliquez pour placer le lieu)</span></p>
        <Suspense fallback={<Loading label="Chargement de la carte…" />}>
          <LocationPicker value={point} onPick={(a, b) => { setValue("latitude", a.toFixed(6)); setValue("longitude", b.toFixed(6)); }} />
        </Suspense>
        <p className="mt-2 text-sm text-navy/75" aria-live="polite">
          {point ? <>Point choisi : {lat}, {lng}. <button type="button" className="link" onClick={() => { setValue("latitude", ""); setValue("longitude", ""); }}>Retirer le point</button></> : "Aucun point choisi."}</p>
      </div>
      <FormField id="pl-phone" label="Téléphone du lieu" error={e("phone")}><input type="tel" className="field" {...fieldProps("pl-phone", e("phone"))} {...register("phone")} /></FormField>
      <FormField id="pl-mail" label="E-mail du lieu" error={e("email")}><input type="email" className="field" {...fieldProps("pl-mail", e("email"))} {...register("email")} /></FormField>
      <FormField id="pl-hours" label="Horaires" hint="Exemple : lundi au vendredi, 8h - 18h" error={e("opening_hours")} className="sm:col-span-2">
        <input className="field" {...fieldProps("pl-hours", e("opening_hours"))} {...register("opening_hours")} /></FormField>
      <FormField id="pl-photo" label="Photo" hint="JPG, PNG ou WebP, 5 Mo maximum." error={photoError} className="sm:col-span-2">
        <input type="file" accept={TYPES.join(",")} className="field" {...fieldProps("pl-photo", photoError)} onChange={(ev) => onPhoto(ev.target.files?.[0])} /></FormField>
      <FormField id="pl-sname" label="Votre nom" required error={e("submitter_name")}><input className="field" {...fieldProps("pl-sname", e("submitter_name"))} {...register("submitter_name")} /></FormField>
      <FormField id="pl-smail" label="Votre e-mail" required error={e("submitter_email")}><input type="email" className="field" {...fieldProps("pl-smail", e("submitter_email"))} {...register("submitter_email")} /></FormField>
      {failure && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 font-semibold text-red-900 sm:col-span-2">{failure}</p>}
      <div className="sm:col-span-2">
        <button disabled={isSubmitting} className="inline-flex min-h-[48px] items-center rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">
          {isSubmitting ? "Envoi en cours…" : "Proposer un lieu"}</button>
      </div>
    </form>
  );
}
