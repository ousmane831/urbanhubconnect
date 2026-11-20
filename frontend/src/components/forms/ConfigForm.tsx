import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { z } from "zod";
import { submitFormFull, submitMultipartFull, type SubmitResult } from "../../services/api";
import { apiErrorMessage, applyServerErrors } from "../../utils/errors";
import { FormField, fieldProps } from "./FormField";
import { Honeypot } from "./Honeypot";
import { ErrorMessage, SuccessMessage } from "./FormMessage";

export interface FieldDef {
  name: string; label: string; type: "text" | "email" | "tel" | "number" | "textarea" | "select" | "multi" | "consent" | "check" | "file";
  required?: boolean; options?: { value: string; label: string; disabled?: boolean }[]; hint?: string; full?: boolean;
  /** Champ affiché seulement quand la case (ou le choix) nommé est coché ; le serveur vérifie s'il est alors exigé. */
  showIf?: string;
  /** Fichiers acceptés (champ « file ») : ex. ".pdf,application/pdf". */
  accept?: string;
}
interface Props { endpoint: string; fields: FieldDef[]; submitLabel?: string; extra?: Record<string, unknown>; successFallback?: string }

const REQUIRED = "Ce champ est obligatoire.";

export function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = { company_website: z.string().optional() };
  for (const f of fields) {
    let s: z.ZodTypeAny;
    if (f.type === "file") { shape[f.name] = z.any(); continue; }
    if (f.showIf) {  // conditionnel : jamais bloquant côté navigateur
      shape[f.name] = f.type === "check" ? z.boolean() : f.type === "multi" ? z.array(z.string()) : z.string().trim();
      continue;
    }
    if (f.type === "consent") s = z.literal(true, { errorMap: () => ({ message: "Ce consentement est obligatoire." }) });
    else if (f.type === "check") s = z.boolean();
    else if (f.type === "multi") s = f.required ? z.array(z.string()).min(1, "Cochez au moins une case.") : z.array(z.string());
    else if (f.type === "email") s = f.required ? z.string().trim().min(1, REQUIRED).email("Cette adresse e-mail n'est pas valide.") : z.string().trim().email("Cette adresse e-mail n'est pas valide.").or(z.literal(""));
    else if (f.type === "select") s = f.required ? z.string().min(1, "Faites un choix.") : z.string();
    else s = f.required ? z.string().trim().min(1, REQUIRED) : z.string().trim();
    shape[f.name] = s;
  }
  return z.object(shape);
}

export function ConfigForm({ endpoint, fields, submitLabel = "Envoyer", extra, successFallback }: Props) {
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const defaults = useMemo(() => Object.fromEntries(fields.filter((f) => f.type !== "file").map((f) => [f.name, f.type === "multi" ? [] : f.type === "consent" || f.type === "check" ? false : ""])), [fields]);
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<FieldValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = watch();
  const visible = (f: FieldDef) => !f.showIf || !!values[f.showIf];
  const [done, setDone] = useState<SubmitResult | null>(null);
  const [failure, setFailure] = useState("");
  const err = (n: string) => errors[n]?.message as string | undefined;

  const onSubmit = async (v: FieldValues) => {
    setFailure("");
    const payload: Record<string, unknown> = { ...extra };
    const shown = new Set(fields.filter(visible).map((f) => f.name));
    const files: [string, File][] = [];
    for (const [k, val] of Object.entries(v)) {
      if (val === "" || val === undefined || (fields.some((f) => f.name === k) && !shown.has(k))) continue;
      if (typeof FileList !== "undefined" && val instanceof FileList) { if (val[0]) files.push([k, val[0]]); continue; }
      payload[k] = val;
    }
    try {
      let r: SubmitResult;
      if (files.length) {  // pièces jointes : envoi en multipart
        const form = new FormData();
        form.append("company_website", "");
        for (const [k, val] of Object.entries(payload)) {
          if (Array.isArray(val)) val.forEach((x) => form.append(k, String(x)));
          else form.append(k, String(val));
        }
        files.forEach(([k, file]) => form.append(k, file));
        r = await submitMultipartFull(endpoint, form);
      } else r = await submitFormFull(endpoint, payload);
      setDone({ ...r, detail: r.detail || successFallback || "Merci." });
    }
    catch (e) { if (!applyServerErrors(e, setError as never)) setFailure(apiErrorMessage(e)); }
  };

  if (done) return <Confirmation r={done} />;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative grid gap-5 sm:grid-cols-2">
      <Honeypot register={register} />
      {fields.filter(visible).map((f) => {
        const e = err(f.name), id = `f-${f.name}`;
        if (f.type === "consent") return (
          <div key={f.name} className="sm:col-span-2">
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-green" {...fieldProps(id, e)} {...register(f.name)} /><span>{f.label} <span className="text-red-700" aria-hidden>*</span></span></label>
            {e && <p id={`${id}-err`} role="alert" className="ml-8 mt-1 text-sm font-semibold text-red-700">{e}</p>}
          </div>);
        if (f.type === "check") return (  // case facultative ; le serveur vérifie si elle est exigée
          <div key={f.name} className="sm:col-span-2">
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-green" {...fieldProps(id, e)} {...register(f.name)} /><span>{f.label}</span></label>
            {f.hint && <p className="ml-8 mt-1 text-sm text-navy/70">{f.hint}</p>}
            {e && <p id={`${id}-err`} role="alert" className="ml-8 mt-1 text-sm font-semibold text-red-700">{e}</p>}
          </div>);
        if (f.type === "multi") return (
          <fieldset key={f.name} className="sm:col-span-2" aria-describedby={e ? `${id}-err` : undefined}><legend className="mb-1.5 font-semibold">{f.label}{f.required && <span className="text-red-700" aria-hidden> *</span>}</legend>
            {f.hint && <p className="mb-2 text-sm text-navy/70">{f.hint}</p>}
            <div className="grid gap-1 sm:grid-cols-2">{f.options?.map((o) => (
              <label key={o.value} className="flex min-h-[44px] items-center gap-3"><input type="checkbox" value={o.value} className="h-5 w-5 accent-green" {...register(f.name)} />{o.label}</label>))}</div>
            {e && <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{e}</p>}
          </fieldset>);
        const wide = f.full || f.type === "textarea";
        return (
          <FormField key={f.name} id={id} label={f.label} required={f.required} error={e} hint={f.hint} className={wide ? "sm:col-span-2" : ""}>
            {f.type === "textarea" ? <textarea rows={5} className="field" {...fieldProps(id, e)} {...register(f.name)} />
              : f.type === "select" ? <select className="field" {...fieldProps(id, e)} {...register(f.name)}><option value="">Choisir…</option>{f.options?.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select>
              : f.type === "file" ? <input type="file" accept={f.accept} className="field py-2" {...fieldProps(id, e)} {...register(f.name)} />
              : f.type === "number" ? <input type="number" inputMode="numeric" min={0} className="field" {...fieldProps(id, e)} {...register(f.name)} />
              : <input type={f.type} className="field" {...fieldProps(id, e)} {...register(f.name)} />}
          </FormField>);
      })}
      {failure && <ErrorMessage className="sm:col-span-2">{failure}</ErrorMessage>}
      <div className="sm:col-span-2">
        <button disabled={isSubmitting} className="inline-flex min-h-[52px] w-full items-center justify-center rounded-lg bg-green px-8 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-green-2 disabled:opacity-60 sm:w-auto">
          {isSubmitting ? "Envoi en cours…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Écran de confirmation : message, puis pour un dossier du Grand Week-End la référence, le statut, la prochaine étape
 *  et les boutons utiles (cahier des charges du 20 novembre 2026). */
function Confirmation({ r }: { r: SubmitResult }) {
  const btn = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-base font-semibold";
  return (
    <SuccessMessage>
      <p>{r.detail}</p>
      {r.reference && (
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">Référence</dt><dd>{r.reference}</dd>
          {r.status && <><dt className="font-semibold">Statut</dt><dd>{r.status}</dd></>}
          {r.next_step && <><dt className="font-semibold">Prochaine étape</dt><dd>{r.next_step}</dd></>}
        </dl>)}
      {(r.reference || r.duplicate) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {r.badge_url && <a href={r.badge_url} className={`${btn} bg-green text-white hover:bg-green-2`}>Voir mon badge</a>}
          {r.visual_url && <a href={r.visual_url} className={`${btn} border border-gold/60 bg-gold/10 text-navy hover:bg-gold/20`}>Créer mon visuel « J'y serai ! »</a>}
          <a href="/suivi" className={`${btn} border border-navy/20 text-navy hover:bg-white`}>Retrouver mon inscription ou mon dossier</a>
        </div>)}
    </SuccessMessage>
  );
}
