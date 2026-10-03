import { isAxiosError } from "axios";

/** Transforme une erreur API en message lisible (détail, première erreur de champ, ou message générique). */
export function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") return data.detail;
      const first = Object.values(data)[0];
      const msg = Array.isArray(first) ? first[0] : first;
      if (typeof msg === "string") return msg;
    }
    if (!error.response) return "Connexion impossible. Vérifiez votre réseau et réessayez.";
  }
  return "Une erreur est survenue. Réessayez ou contactez la Coordination.";
}

export const isNotFound = (e: unknown) => isAxiosError(e) && e.response?.status === 404;

/** Rattache les erreurs de validation du backend (400) aux champs du formulaire. Retourne true si au moins une l'a été. */
export function applyServerErrors(error: unknown, setError: (name: never, e: { message: string }) => void): boolean {
  if (!isAxiosError(error) || error.response?.status !== 400) return false;
  const data = error.response.data as Record<string, unknown>;
  let applied = false;
  for (const [field, msgs] of Object.entries(data ?? {})) {
    const message = Array.isArray(msgs) ? String(msgs[0]) : typeof msgs === "string" ? msgs : null;
    if (message && field !== "detail") { setError(field as never, { message }); applied = true; }
  }
  return applied;
}
