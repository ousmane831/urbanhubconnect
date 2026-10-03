import axios from "axios";

// Session côté serveur (cookie HttpOnly) + protection CSRF : aucun jeton n'est stocké dans le navigateur.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? "/api"}/coordination`,
  withCredentials: true, xsrfCookieName: "csrftoken", xsrfHeaderName: "X-CSRFToken", timeout: 15000,
});
api.interceptors.response.use((r) => r, (e) => {
  const url: string = e.config?.url ?? "";
  if ([401, 403].includes(e.response?.status) && !url.includes("login") && !url.includes("csrf")) window.dispatchEvent(new Event("coord-expired"));
  return Promise.reject(e);
});

export interface Me { username: string; name: string; role: string }
export interface Summary { queues: { kind: string; label: string; count: number }[]; stats: { label: string; value: number }[]; to_handle: number }
export interface ActionDef { id: string; label: string; tone: "primary" | "danger" | "neutral" }
export interface QueueItem { id: number; title: string; subtitle: string; created_at: string; state: string | null; details: [string, string][]; actions: ActionDef[] }
export interface ContentItem { id: number; title: string; state: string; actions: ActionDef[]; admin_url: string }

export const coordApi = {
  csrf: () => api.get("/csrf/"),
  login: (username: string, password: string) => api.post<Me>("/login/", { username, password }).then((r) => r.data),
  logout: () => api.post("/logout/"),
  me: () => api.get<Me>("/me/").then((r) => r.data),
  summary: () => api.get<Summary>("/summary/").then((r) => r.data),
  queue: (kind: string) => api.get<{ label: string; items: QueueItem[] }>(`/queue/${kind}/`).then((r) => r.data),
  act: (kind: string, id: number, action: string) => api.post<{ detail: string }>(`/queue/${kind}/${id}/${action}/`).then((r) => r.data.detail),
  content: () => api.get<{ articles: ContentItem[]; events: ContentItem[] }>("/content/").then((r) => r.data),
  contentAct: (kind: string, id: number, action: string) => api.post<{ detail: string }>(`/content/${kind}/${id}/${action}/`).then((r) => r.data.detail),
};
