import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { z } from "zod";
import { submitForm } from "../../services/api";
import { apiErrorMessage, applyServerErrors } from "../../utils/errors";
import { FormField, fieldProps } from "./FormField";
import { Honeypot } from "./Honeypot";

export interface FieldDef {
  name: string; label: string; type: "text" | "email" | "tel" | "textarea" | "select" | "multi" | "consent";
  required?: boolean; options?: { value: string; label: string }[]; hint?: string; full?: boolean;
}
interface Props { endpoint: string; fields: FieldDef[]; submitLabel?: string; extra?: Record<string, unknown>; successFallback?: string }

const REQUIRED = "Ce champ est obligatoire.";

export function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = { company_website: z.string().optional() };
  for (const f of fields) {
    let s: z.ZodTypeAny;
    if (f.type === "consent") s = z.literal(true, { errorMap: () => ({ message: "Ce consentement est obligatoire." }) });
    else if (f.type === "multi") s = z.array(z.string());
    else if (f.type === "email") s = f.required ? z.string().trim().min(1, REQUIRED).email("Cette adresse e-mail n'est pas valide.") : z.string().trim().email("Cette adresse e-mail n'est pas valide.").or(z.literal(""));
    else if (f.type === "select") s = f.required ? z.string().min(1, "Faites un choix.") : z.string();
    else s = f.required ? z.string().trim().min(1, REQUIRED) : z.string().trim();
    shape[f.name] = s;
  }
  return z.object(shape);
}

export function ConfigForm({ endpoint, fields, submitLabel = "Envoyer", extra, successFallback }: Props) {
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const defaults = useMemo(() => Object.fromEntries(fields.map((f) => [f.name, f.type === "multi" ? [] : f.type === "consent" ? false : ""])), [fields]);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FieldValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const [done, setDone] = useState("");
  const [failure, setFailure] = useState("");
  const err = (n: string) => errors[n]?.message as string | undefined;

  const onSubmit = async (v: FieldValues) => {
    setFailure("");
    const payload: Record<string, unknown> = { ...extra };
    for (const [k, val] of Object.entries(v)) if (val !== "" && val !== undefined) payload[k] = val;
    try { setDone(await submitForm(endpoint, payload) || successFallback || "Merci."); }
    catch (e) { if (!applyServerErrors(e, setError as never)) setFailure(apiErrorMessage(e)); }
  };

  if (done) return <p role="status" className="rounded-md border border-green/40 bg-green/5 p-5 text-lg">{done}</p>;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative grid gap-5 sm:grid-cols-2">
      <Honeypot register={register} />
      {fields.map((f) => {
        const e = err(f.name), id = `f-${f.name}`;
        if (f.type === "consent") return (
          <div key={f.name} className="sm:col-span-2">
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-green" {...fieldProps(id, e)} {...register(f.name)} /><span>{f.label} <span className="text-red-700" aria-hidden>*</span></span></label>
            {e && <p id={`${id}-err`} role="alert" className="ml-8 mt-1 text-sm font-semibold text-red-700">{e}</p>}
          </div>);
        if (f.type === "multi") return (
          <fieldset key={f.name} className="sm:col-span-2"><legend className="mb-1.5 font-semibold">{f.label}</legend>
            <div className="grid gap-1 sm:grid-cols-2">{f.options?.map((o) => (
              <label key={o.value} className="flex min-h-[44px] items-center gap-3"><input type="checkbox" value={o.value} className="h-5 w-5 accent-green" {...register(f.name)} />{o.label}</label>))}</div>
          </fieldset>);
        const wide = f.full || f.type === "textarea";
        return (
          <FormField key={f.name} id={id} label={f.label} required={f.required} error={e} hint={f.hint} className={wide ? "sm:col-span-2" : ""}>
            {f.type === "textarea" ? <textarea rows={5} className="field" {...fieldProps(id, e)} {...register(f.name)} />
              : f.type === "select" ? <select className="field" {...fieldProps(id, e)} {...register(f.name)}><option value="">Choisir…</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              : <input type={f.type} className="field" {...fieldProps(id, e)} {...register(f.name)} />}
          </FormField>);
      })}
      {failure && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 font-semibold text-red-900 sm:col-span-2">{failure}</p>}
      <div className="sm:col-span-2">
        <button disabled={isSubmitting} className="inline-flex min-h-[48px] items-center rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">
          {isSubmitting ? "Envoi en cours…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
