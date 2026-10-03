export interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; done: boolean }

/** Calcule le temps restant jusqu'à la cible. Toujours dynamique : jamais de valeur codée en dur. */
export function timeLeft(target: string | number | Date, now: number = Date.now()): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: diff === 0 };
}
