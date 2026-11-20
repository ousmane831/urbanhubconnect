import { http } from "./http";
import type {ActionsData, BandPartner, EventDetail, PageContent, Article, DocumentItem, EventItem, Partner, PressRelease, Priced, RefItem, MapCategory, MapPlace, OrganizationDetail, OrganizationFilters, OrganizationListItem, Paginated, SiteSettings, MembershipCategoryItem } from "../types/api";

export const getSiteSettings = () => http.get<SiteSettings>("/site-settings/").then((r) => r.data);
export const getFeaturedEvents = () =>
  http.get<Paginated<EventItem>>("/events/", { params: { is_featured: true, upcoming: true } }).then((r) => r.data.results);
export const getOrganizationFilters = () => http.get<OrganizationFilters>("/organizations/filters/").then((r) => r.data);

/** POST public d'un formulaire ; le champ piège anti-spam est envoyé vide. */
export const submitForm = (path: string, data: Record<string, unknown>) => submitFormFull(path, data).then((r) => r.detail);

/** Réponse complète : pour un dossier du Grand Week-End, référence, statut, prochaine étape et liens personnels. */
export interface SubmitResult {
  detail: string; duplicate?: boolean; reference?: string; status?: string; next_step?: string; badge_url?: string; visual_url?: string;
  business_connect_url?: string;
}
export const submitFormFull = (path: string, data: Record<string, unknown>) =>
  http.post<SubmitResult>(path, { company_website: "", ...data }).then((r) => r.data);

// ---------- Suivi des dossiers sans compte ----------
export interface DossierRow {
  kind: string; id: number; type: string; reference: string; name: string; status: string; status_label: string; next_step: string;
  created_at: string; can_complete: boolean; can_cancel: boolean; badge_url?: string; visual_url?: string;
  business_connect_url?: string; meetings?: string[];
}
export const getBcSlots = () => http.get<{ id: number; label: string }[]>("/business-connect/slots/").then((r) => r.data);
export type BadgeContact = { participant_name: string; organization: string; job_title: string; email: string; phone: string };
export const getBadgeContact = (token: string, key: string) =>
  http.get<BadgeContact>(`/badges/${encodeURIComponent(token)}/coordonnees/`, { params: { cle: key } }).then((r) => r.data);
export const getGalaInfo = () => http.get<{ ticket_url: string | null }>("/gwe/gala/").then((r) => r.data);
export interface GuestState {
  kind: string; organization: string; holder: string; quota: number; remaining: number; gala: boolean;
  guests: { id: number; name: string; job_title: string; organization: string; reference: string; badge_sent: boolean }[];
}
type GuestResult = GuestState & { detail: string };
export const getGuests = (token: string) => http.get<GuestState>(`/invites/${encodeURIComponent(token)}/`).then((r) => r.data);
export const addGuest = (token: string, g: { name: string; job_title: string; organization: string; email: string }) =>
  http.post<GuestResult>(`/invites/${encodeURIComponent(token)}/`, g).then((r) => r.data);
export const removeGuest = (token: string, id: number) =>
  http.post<GuestResult>(`/invites/${encodeURIComponent(token)}/${id}/retirer/`).then((r) => r.data);
export const saveDraft = (form: string, email: string, data: Record<string, unknown>, token?: string) =>
  http.post<{ detail: string; token: string }>("/brouillons/", { form, email, data, token }).then((r) => r.data);
export const loadDraft = (token: string) =>
  http.get<{ form: string; data: Record<string, unknown>; token: string }>(`/brouillons/${encodeURIComponent(token)}/`).then((r) => r.data);
export const getGwePlaces = () => http.get<{ limited: boolean; full: boolean }>("/gwe/places/").then((r) => r.data);
export interface AwardCategoryState { name: string; slug: string; description: string; closes_on: string | null; is_open: boolean }
export const getAwardCategoryStates = () => http.get<AwardCategoryState[]>("/awards/categories/").then((r) => r.data);
export const requestTrackingLink = (email: string) => http.post<{ detail: string }>("/suivi/", { email }).then((r) => r.data.detail);
export const getTracking = (token: string) =>
  http.get<{ email: string; dossiers: DossierRow[] }>(`/suivi/${encodeURIComponent(token)}/`).then((r) => r.data);
export const cancelDossier = (token: string, d: DossierRow) =>
  http.post<{ detail: string; dossier: DossierRow }>(`/suivi/${encodeURIComponent(token)}/${d.kind}/${d.id}/annuler/`).then((r) => r.data);
export const completeDossier = (token: string, d: DossierRow, message: string) =>
  http.post<{ detail: string; dossier: DossierRow }>(`/suivi/${encodeURIComponent(token)}/${d.kind}/${d.id}/completer/`, { message }).then((r) => r.data);

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== false));

export interface OrgQuery { search?: string; pole?: string; college?: string; sector?: string; commission?: string; founder?: boolean; page?: number; propose?: boolean; recherche?: boolean }
export const listOrganizations = (q: OrgQuery) =>
  http.get<Paginated<OrganizationListItem>>("/organizations/", { params: clean(q) }).then((r) => r.data);
export const getOrganization = (slug: string) => http.get<OrganizationDetail>(`/organizations/${slug}/`).then((r) => r.data);
export const listPlaces = (q: { category?: string; pole?: string; search?: string }) =>
  http.get<MapPlace[]>("/map/places/", { params: clean(q) }).then((r) => r.data);
export const getMapCategories = () => http.get<MapCategory[]>("/map/categories/").then((r) => r.data);
export type TravelMode = "driving" | "foot";
export interface RouteStep { instruction: string; distance: number; duration: number; type: number | null; location: [number, number] | null }
export interface RouteResult { mode: TravelMode; distance: number; duration: number; geometry: [number, number][]; steps: RouteStep[] }
/** Trajet par les routes (calculé par notre serveur avec OpenRouteService). La position n'est pas enregistrée. */
export const getRoute = (from: [number, number], to: [number, number], mode: TravelMode) =>
  http.get<RouteResult>("/map/route/", { params: { from: from.join(","), to: to.join(","), mode }, timeout: 20000 }).then((r) => r.data);
export const submitMultipart = (path: string, form: FormData) => http.post<{ detail: string }>(path, form).then((r) => r.data.detail);
export const submitMultipartFull = (path: string, form: FormData) => http.post<SubmitResult>(path, form).then((r) => r.data);

const get = <T,>(url: string, params?: object) => http.get<T>(url, { params: params ? clean(params) : undefined }).then((r) => r.data);
export const listEvents = (q: { category?: string; upcoming?: boolean; page?: number }) =>
  get<Paginated<EventItem>>("/events/", { ...q, upcoming: q.upcoming === false ? "false" : "true" });
export const getEvent = (slug: string) => get<EventDetail>(`/events/${slug}/`);
export const getPage = (slug: string) => get<PageContent>(`/pages/${slug}/`);
export const getPages = (prefix: string) => get<PageContent[]>("/pages/", { prefix });
export const getEventCategories = () => get<RefItem[]>("/events/categories/");
export const listArticles = (q: { category__slug?: string; page?: number }) => get<Paginated<Article>>("/articles/", q);
export const getArticle = (slug: string) => get<Article>(`/articles/${slug}/`);
export const getArticleCategories = () => get<RefItem[]>("/articles/categories/");
export const getMembershipCategories = () => get<MembershipCategoryItem[]>("/memberships/categories/");
export const getTiers = () => get<Priced[]>("/partnerships/tiers/");
export const getPartners = () => get<Partner[]>("/partnerships/partners/");
export const getPartnerBand = () => get<BandPartner[]>("/partnerships/band/");
export interface BadgeEvent { title: string; dates: string; location: string }
/** Sans la clé du titulaire (lien reçu par e-mail), l'API ne renvoie aucune identité : owner = false. */
export type BadgeInfo =
  | { owner: false; event: BadgeEvent }
  | {
    owner: true; name: string; organization: string; job_title?: string; number?: number | null; reference: string; kind: string;
    days: string[]; valid: boolean; confirmed: boolean; category: string; status: string; checkins: { day: string; at: string }[]; event: BadgeEvent;
  };
export const getBadge = (token: string, key?: string | null) =>
  get<BadgeInfo>(`/badges/${encodeURIComponent(token)}/`, key ? { cle: key } : undefined);
export const resendBadge = (token: string) =>
  http.post<{ detail: string }>(`/badges/${encodeURIComponent(token)}/renvoyer/`).then((r) => r.data.detail);
export interface UnsubscribeState { email: string; unsubscribed: boolean }
export const getUnsubscribe = (token: string) => get<UnsubscribeState>(`/unsubscribe/${encodeURIComponent(token)}/`);
export const confirmUnsubscribe = (token: string) =>
  http.post<UnsubscribeState>(`/unsubscribe/${encodeURIComponent(token)}/`).then((r) => r.data);
export const badgePdfUrl = (token: string, key: string) =>
  `${import.meta.env.VITE_API_URL ?? "/api"}/badges/${encodeURIComponent(token)}/badge.pdf?cle=${encodeURIComponent(key)}`;
/** Image du badge : réservée au titulaire (clé) ou à la Coordination connectée. */
export const badgeImageUrl = (token: string, key: string, download = false) =>
  `${import.meta.env.VITE_API_URL ?? "/api"}/badges/${encodeURIComponent(token)}/badge.png?cle=${encodeURIComponent(key)}${download ? "&telecharger=1" : ""}`;
export const getPressReleases = () => get<PressRelease[]>("/press/");
export const getDocuments = (category?: string) => get<DocumentItem[]>("/documents/", { category });
export const getAwardCategories = () => get<RefItem[]>("/awards/categories/");
export const getVolunteerMissions = () => get<RefItem[]>("/volunteers/missions/");

export const getActions = () => get<ActionsData>("/actions/");
