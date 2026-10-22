import axios from "axios";
import type { OrganizationDetail, OrganizationListItem, Paginated } from "../types/api";

// Session côté serveur (cookie HttpOnly) + protection CSRF : aucun jeton n'est stocké dans le navigateur.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? "/api"}/members`,
  withCredentials: true, xsrfCookieName: "csrftoken", xsrfHeaderName: "X-CSRFToken", timeout: 20000,
});
api.interceptors.response.use((r) => r, (e) => {
  const url: string = e.config?.url ?? "";
  if ([401, 403].includes(e.response?.status) && !/login|csrf|password/.test(url)) window.dispatchEvent(new Event("member-expired"));
  return Promise.reject(e);
});

export interface MemberMe { name: string; email: string; reference?: string; status?: string; valid_until?: string | null; is_founder?: boolean; category?: string; organization?: string }
export interface ProfileValues {
  description: string; website: string; linkedin: string; facebook: string; instagram: string; neighborhood: string; address: string;
  latitude: string | null; longitude: string | null;
  phone: string; email: string; representative_name: string; representative_role: string; representative_phone: string; representative_email: string;
  offers: string; needs: string;
}
export interface ProfileData {
  membership: MemberMe;
  organization: ({ name: string; logo: string | null } & ProfileValues) | null;
  pending: { fields: string[]; since: string } | null;
  listing: { published: boolean; hidden_by_member: boolean; public_listing: boolean; validated: boolean };
}
export interface MemberOrganizationDetail extends OrganizationDetail { offers: string; needs: string }
export interface ContactInfo { name: string; role: string; phone: string; email: string }

const clean = (o: Record<string, string | number | boolean | undefined>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== false));

export const memberApi = {
  csrf: () => api.get("/csrf/"),
  login: (identifier: string, password: string) => api.post<MemberMe>("/login/", { identifier, password }).then((r) => r.data),
  logout: () => api.post("/logout/"),
  me: () => api.get<MemberMe>("/me/").then((r) => r.data),
  resetPassword: (email: string) => api.post<{ detail: string }>("/password-reset/", { email }).then((r) => r.data.detail),
  setPassword: (uid: string, token: string, password: string) => api.post<{ detail: string }>("/set-password/", { uid, token, password }).then((r) => r.data.detail),
  profile: () => api.get<ProfileData>("/profile/").then((r) => r.data),
  saveProfile: (body: FormData) => api.post<{ detail: string } & ProfileData>("/profile/", body).then((r) => r.data),
  listing: (action: "hide" | "show") => api.post<{ detail: string } & ProfileData>("/listing/", { action }).then((r) => r.data),
  directory: (params: Record<string, string | number | boolean | undefined>) =>
    api.get<Paginated<OrganizationListItem>>("/directory/", { params: clean(params) }).then((r) => r.data),
  directoryDetail: (slug: string) => api.get<MemberOrganizationDetail>(`/directory/${slug}/`).then((r) => r.data),
  reveal: (slug: string) => api.post<ContactInfo>(`/directory/${slug}/contact/`).then((r) => r.data),
};
