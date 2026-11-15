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
  campaigns: () => api.get<CampaignOverview>("/campaigns/").then((r) => r.data),
  campaignContacts: (search: string) => api.get<CampaignContact[]>("/campaigns/contacts/", { params: search ? { search } : undefined }).then((r) => r.data),
  campaignImport: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ImportResult>("/campaigns/contacts/import/", form, { timeout: 60000 }).then((r) => r.data);
  },
  campaignRemoveContact: (id: number) => api.post<{ detail: string }>(`/campaigns/contacts/${id}/remove/`).then((r) => r.data.detail),
  campaignPreview: (data: Partial<CampaignInput>) => api.post<CampaignPreview>("/campaigns/preview/", data).then((r) => r.data),
  campaignSave: (data: CampaignInput, id?: number) =>
    (id ? api.put<Campaign>(`/campaigns/${id}/`, data) : api.post<Campaign>("/campaigns/new/", data)).then((r) => r.data),
  campaignAct: (id: number, action: string, data: Record<string, string> = {}) =>
    api.post<{ detail: string }>(`/campaigns/${id}/${action}/`, data, { timeout: 60000 }).then((r) => r.data.detail),
};

export interface CheckinResult {
  result: "ok" | "already" | "cancelled" | "invalid"; message: string; id?: number; name?: string; organization?: string;
  options?: string[]; planting?: boolean; today_at?: string; checkins?: { day: string; at: string }[];
}
export interface CheckinPerson {
  id: number; name: string; organization: string; email: string; phone: string; valid: boolean; planting: boolean; badge_sent: boolean; checkins: string[];
}
export interface CheckinStats { registered: number; today: number; by_day: Record<string, number>; planting_taken: number; planting_seats: number | null }

export interface CampaignInput {
  title: string; subject: string; body: string; cta_label: string; cta_url: string; segments: string[]; activities: string[];
  frequency: "once" | "weekly" | "weekend"; weekday: number; send_time: string; start_date: string; end_date: string | null;
}
export interface Campaign extends CampaignInput {
  id: number; status: "draft" | "active" | "paused" | "done"; status_label: string; schedule: string; recipients: number;
  next_send: string | null; stats: { sent: number; failed: number; last_sent_at: string | null }; actions: string[];
}
export interface CountedValue { value: string; count: number }
export interface CampaignOverview {
  contacts: { total: number; active: number; unsubscribed: number; segments: CountedValue[]; activities: CountedValue[] };
  campaigns: Campaign[];
  sending: { problem: string; daily_limit: number; sent_today: number; from: string };
}
export interface CampaignContact { id: number; email: string; organization: string; name: string; segment: string; activity: string; unsubscribed: boolean }
export interface ImportResult {
  created: number; updated: number; unchanged: number; skipped_count: number; unsubscribed_kept: number; columns: string[];
  skipped: { sheet?: string; line: number; value: string; reason: string }[]; sheets?: string[]; ignored_sheets?: string[]; split?: number; duplicates?: number;
}
export interface CampaignPreview { subject: string; html: string; recipients: number; schedule: string }
