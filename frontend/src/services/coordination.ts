import axios from "axios";

// Session côté serveur (cookie HttpOnly) + protection CSRF : aucun jeton n'est stocké dans le navigateur.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? "/api"}/coordination`,
  withCredentials: true, withXSRFToken: true, xsrfCookieName: "csrftoken", xsrfHeaderName: "X-CSRFToken", timeout: 15000,
});
api.interceptors.response.use((r) => r, (e) => {
  const url: string = e.config?.url ?? "";
  if ([401, 403].includes(e.response?.status) && !url.includes("login") && !url.includes("csrf")) window.dispatchEvent(new Event("coord-expired"));
  return Promise.reject(e);
});

export interface Me { username: string; name: string; role: string }
export interface Summary { queues: { kind: string; label: string; count: number }[]; stats: { label: string; value: number }[]; to_handle: number }
export interface ActionDef {
  id: string; label: string; tone: "primary" | "danger" | "neutral";
  form?: "payment" | "category"; amount?: number | null; options?: { value: string; label: string }[];
}
export interface QueueItem { id: number; title: string; subtitle: string; created_at: string; state: string | null; details: [string, string][]; actions: ActionDef[] }
export interface ContentItem { id: number; title: string; state: string; actions: ActionDef[]; admin_url: string }

export const coordApi = {
  csrf: () => api.get("/csrf/"),
  login: (username: string, password: string) => api.post<Me>("/login/", { username, password }).then((r) => r.data),
  logout: () => api.post("/logout/"),
  me: () => api.get<Me>("/me/").then((r) => r.data),
  summary: () => api.get<Summary>("/summary/").then((r) => r.data),
  queue: (kind: string, search?: string) =>
    api.get<{ label: string; items: QueueItem[] }>(`/queue/${kind}/`, { params: search ? { search } : undefined }).then((r) => r.data),
  act: (kind: string, id: number, action: string, data: Record<string, string> = {}) => api.post<{ detail: string }>(`/queue/${kind}/${id}/${action}/`, data).then((r) => r.data.detail),
  content: () => api.get<{ articles: ContentItem[]; events: ContentItem[] }>("/content/").then((r) => r.data),
  contentAct: (kind: string, id: number, action: string) => api.post<{ detail: string }>(`/content/${kind}/${id}/${action}/`).then((r) => r.data.detail),
  checkin: (body: { code: string } | { id: number }) => api.post<CheckinResult>("/checkin/", body).then((r) => r.data),
  checkinSearch: (q: string) => api.get<CheckinPerson[]>("/checkin/search/", { params: { q } }).then((r) => r.data),
  checkinResend: (id: number) => api.post<{ detail: string }>("/checkin/resend/", { id }).then((r) => r.data.detail),
  checkinStats: () => api.get<CheckinStats>("/checkin/stats/").then((r) => r.data),
};

export interface CheckinResult {
  result: "ok" | "already" | "cancelled" | "invalid"; message: string; id?: number; name?: string; organization?: string;
  options?: string[]; planting?: boolean; today_at?: string; checkins?: { day: string; at: string }[];
}
export interface CheckinPerson {
  id: number; name: string; organization: string; email: string; phone: string; valid: boolean; planting: boolean; badge_sent: boolean; checkins: string[];
}
export interface CheckinStats { registered: number; today: number; by_day: Record<string, number>; planting_taken: number; planting_seats: number | null }
