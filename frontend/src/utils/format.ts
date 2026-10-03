const TZ = "Africa/Dakar";
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: TZ });
const dayMonth = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
export const fmtDate = (iso: string) => date.format(new Date(iso));
export const fmtDay = (iso: string) => dayMonth.format(new Date(iso));
export const fmtRange = (start: string, end: string | null) => (end ? `Du ${fmtDate(start)} au ${fmtDate(end)}` : fmtDate(start));
export const fmtFcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ")} FCFA`;
