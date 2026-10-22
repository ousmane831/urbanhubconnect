export const MIN_PASSWORD = 10;

/** Contrôle côté navigateur (le serveur revérifie). Retourne le problème à afficher, ou null si le mot de passe convient. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`;
  if (/^\d+$/.test(password)) return "Le mot de passe ne peut pas être composé uniquement de chiffres.";
  if (password !== confirm) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}
