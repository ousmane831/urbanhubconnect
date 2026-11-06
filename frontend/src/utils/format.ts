const TZ = "Africa/Dakar";
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: TZ });
const dayMonth = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const parts = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
export const fmtDate = (iso: string) => date.format(new Date(iso));
export const fmtDay = (iso: string) => dayMonth.format(new Date(iso));

const split = (iso: string) => {
  const p = Object.fromEntries(parts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { day: Number(p.day), month: p.month as string, year: p.year as string };
};

/** « 11 et 12 décembre 2026 », « 11 au 14 décembre 2026 » ou « 30 novembre 2026 au 2 décembre 2026 ». */
export function fmtDays(start: string, end: string | null): string {
  if (!end) return fmtDate(start);
  const a = split(start), b = split(end);
  if (a.month !== b.month || a.year !== b.year) return `${fmtDate(start)} au ${fmtDate(end)}`;
  if (a.day === b.day) return fmtDate(start);
  return `${a.day === 1 ? "1er" : a.day} ${b.day - a.day === 1 ? "et" : "au"} ${b.day} ${b.month} ${b.year}`;
}

export function fmtRange(start: string, end: string | null): string {
  const days = fmtDays(start, end);
  if (!end || days === fmtDate(start)) return days;
  const a = split(start), b = split(end);
  const twoDays = a.month === b.month && a.year === b.year && b.day - a.day === 1;
  return `${twoDays ? "Les" : "Du"} ${days}`;
}
export const fmtFcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ")} FCFA`;
