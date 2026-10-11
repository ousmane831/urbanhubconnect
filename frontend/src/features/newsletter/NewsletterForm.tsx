import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField, fieldProps } from "../../components/forms/FormField";
import { Honeypot } from "../../components/forms/Honeypot";
import { submitForm } from "../../services/api";
import { apiErrorMessage } from "../../utils/errors";

const schema = z.object({
  email: z.string().min(1, "Saisissez votre adresse e-mail.").email("Cette adresse e-mail n'est pas valide."),
  name: z.string().max(150).optional(),
  organization: z.string().max(200).optional(),
  company_website: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/** `compact` : un seul champ (pied de page). `full` : nom, e-mail, organisation (page Actualités, « La Lettre du Hub »). */
export function NewsletterForm({ onDark = false, variant = "compact" }: { onDark?: boolean; variant?: "compact" | "full" }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async (v: Values) => {
    setFeedback(null);
    try { setFeedback({ ok: true, text: await submitForm("/newsletter/", v) }); reset(); }
    catch (e) { setFeedback({ ok: false, text: apiErrorMessage(e) }); }
  };
  const message = (
    <p id="nl-msg" role={feedback && !feedback.ok ? "alert" : "status"}
      className={`min-h-[1.5rem] text-sm font-semibold ${feedback?.ok ? (onDark ? "text-mint" : "text-green") : onDark ? "text-red-300" : "text-red-700"}`}>
      {variant === "compact" ? errors.email?.message ?? feedback?.text : feedback?.text}
    </p>);

  if (variant === "full") return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative grid max-w-3xl gap-5 sm:grid-cols-2" aria-label="Abonnement à La Lettre du Hub">
      <Honeypot register={register} />
      <FormField id="nl-name" label="Nom" error={errors.name?.message}><input autoComplete="name" className="field" {...fieldProps("nl-name", errors.name?.message)} {...register("name")} /></FormField>
      <FormField id="nl-email" label="E-mail" required error={errors.email?.message}><input type="email" autoComplete="email" className="field" {...fieldProps("nl-email", errors.email?.message)} {...register("email")} /></FormField>
      <FormField id="nl-org" label="Organisation" error={errors.organization?.message} className="sm:col-span-2"><input autoComplete="organization" className="field" {...fieldProps("nl-org", errors.organization?.message)} {...register("organization")} /></FormField>
      <div className="sm:col-span-2">
        <button disabled={isSubmitting} className="inline-flex min-h-[48px] items-center rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">
          {isSubmitting ? "Envoi…" : "Je m'abonne"}</button>
        {message}
      </div>
    </form>);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-3">
      <Honeypot register={register} />
      <label htmlFor="nl-email" className="block font-semibold">Recevoir les actualités du réseau</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="nl-email" type="email" autoComplete="email" placeholder="votre@email.com" aria-invalid={!!errors.email}
          aria-describedby="nl-msg" className={`field text-navy ${onDark ? "border-white/30" : ""}`} {...register("email")} />
        <button disabled={isSubmitting} className="min-h-[44px] rounded-md bg-gold px-5 font-semibold text-navy hover:bg-gold-light disabled:opacity-60">
          {isSubmitting ? "Envoi…" : "S'abonner"}
        </button>
      </div>
      {message}
    </form>
  );
}
