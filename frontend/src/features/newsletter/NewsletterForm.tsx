import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Honeypot } from "../../components/forms/Honeypot";
import { submitForm } from "../../services/api";
import { apiErrorMessage } from "../../utils/errors";

const schema = z.object({
  email: z.string().min(1, "Saisissez votre adresse e-mail.").email("Cette adresse e-mail n'est pas valide."),
  name: z.string().max(150).optional(),
  company_website: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function NewsletterForm({ onDark = false }: { onDark?: boolean }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async (v: Values) => {
    setFeedback(null);
    try { setFeedback({ ok: true, text: await submitForm("/newsletter/", v) }); reset(); }
    catch (e) { setFeedback({ ok: false, text: apiErrorMessage(e) }); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <Honeypot register={register} />
      <label htmlFor="nl-email" className="block font-semibold">Recevoir les actualités du réseau</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="nl-email" type="email" autoComplete="email" placeholder="votre@email.com" aria-invalid={!!errors.email}
          aria-describedby="nl-msg" className={`field text-navy ${onDark ? "border-white/30" : ""}`} {...register("email")} />
        <button disabled={isSubmitting} className="min-h-[44px] rounded-md bg-gold px-5 font-semibold text-navy hover:bg-gold-light disabled:opacity-60">
          {isSubmitting ? "Envoi…" : "S'abonner"}
        </button>
      </div>
      <p id="nl-msg" role={feedback && !feedback.ok ? "alert" : "status"} className={`min-h-[1.5rem] text-sm ${feedback?.ok ? "text-mint" : "text-red-300"}`}>
        {errors.email?.message ?? feedback?.text}
      </p>
    </form>
  );
}
