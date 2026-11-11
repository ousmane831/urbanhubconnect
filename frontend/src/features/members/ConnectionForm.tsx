import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "../../utils/errors";

export const MESSAGE_MIN = 20, MESSAGE_MAX = 1000;

/** Zone de message avec contrôle de longueur ; `onSend` retourne le message de confirmation du serveur. */
export function ConnectionForm({ onSend, submitLabel = "Envoyer la demande", label = "Votre message", id = "cf" }: {
  onSend: (message: string) => Promise<string>; submitLabel?: string; label?: string; id?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const text = message.trim();
    if (text.length < MESSAGE_MIN) return setFeedback({ ok: false, text: `Votre message est trop court : présentez-vous et expliquez l'objet de la demande (${MESSAGE_MIN} caractères minimum).` });
    if (text.length > MESSAGE_MAX) return setFeedback({ ok: false, text: `Votre message est trop long (${MESSAGE_MAX} caractères maximum).` });
    setBusy(true); setFeedback(null);
    try { setFeedback({ ok: true, text: await onSend(text) }); setMessage(""); }
    catch (err) { setFeedback({ ok: false, text: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label htmlFor={id} className="mb-1.5 block font-semibold">{label}</label>
        <textarea id={id} rows={4} className="field" value={message} onChange={(e) => setMessage(e.target.value)} />
        <p className="mt-1 text-sm text-navy/65">{message.trim().length} / {MESSAGE_MAX} caractères</p></div>
      {feedback && <p role={feedback.ok ? "status" : "alert"} className={`font-semibold ${feedback.ok ? "text-green" : "text-red-800"}`}>{feedback.text}</p>}
      <button disabled={busy} className="min-h-[44px] rounded-lg bg-green px-6 font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Envoi…" : submitLabel}</button>
    </form>
  );
}
