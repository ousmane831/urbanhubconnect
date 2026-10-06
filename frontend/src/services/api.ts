import { http } from "./http";
import type { EventDetail, PageContent, Article, DocumentItem, EventItem, Partner, PressRelease, Priced, RefItem, MapCategory, MapPlace, OrganizationDetail, OrganizationFilters, OrganizationListItem, Paginated, SiteSettings } from "../types/api";

export const getSiteSettings = () => http.get<SiteSettings>("/site-settings/").then((r) => r.data);
export const getFeaturedEvents = () =>
  http.get<Paginated<EventItem>>("/events/", { params: { is_featured: true, upcoming: true } }).then((r) => r.data.results);
export const getOrganizationFilters = () => http.get<OrganizationFilters>("/organizations/filters/").then((r) => r.data);

/** POST public d'un formulaire ; le champ piège anti-spam est envoyé vide. */
export const submitForm = (path: string, data: Record<string, unknown>) =>
  http.post<{ detail: string }>(path, { company_website: "", ...data }).then((r) => r.data.detail);

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== false));

export interface OrgQuery { search?: string; pole?: string; college?: string; sector?: string; commission?: string; founder?: boolean; page?: number }
export const listOrganizations = (q: OrgQuery) =>
  http.get<Paginated<OrganizationListItem>>("/organizations/", { params: clean(q) }).then((r) => r.data);
export const getOrganization = (slug: string) => http.get<OrganizationDetail>(`/organizations/${slug}/`).then((r) => r.data);
export const listPlaces = (q: { category?: string; pole?: string; search?: string }) =>
  http.get<MapPlace[]>("/map/places/", { params: clean(q) }).then((r) => r.data);
export const getMapCategories = () => http.get<MapCategory[]>("/map/categories/").then((r) => r.data);
export const submitMultipart = (path: string, form: FormData) => http.post<{ detail: string }>(path, form).then((r) => r.data.detail);

const get = <T,>(url: string, params?: object) => http.get<T>(url, { params: params ? clean(params) : undefined }).then((r) => r.data);
export const listEvents = (q: { category?: string; upcoming?: boolean; page?: number }) =>
  get<Paginated<EventItem>>("/events/", { ...q, upcoming: q.upcoming === false ? "false" : "true" });
export const getEvent = (slug: string) => get<EventDetail>(`/events/${slug}/`);
export const getPage = (slug: string) => get<PageContent>(`/pages/${slug}/`);
export const getEventCategories = () => get<RefItem[]>("/events/categories/");
export const listArticles = (q: { category__slug?: string; page?: number }) => get<Paginated<Article>>("/articles/", q);
export const getArticle = (slug: string) => get<Article>(`/articles/${slug}/`);
export const getArticleCategories = () => get<RefItem[]>("/articles/categories/");
export const getMembershipCategories = () => get<Priced[]>("/memberships/categories/");
export const getTiers = () => get<Priced[]>("/partnerships/tiers/");
export const getPartners = () => get<Partner[]>("/partnerships/partners/");
export const getPressReleases = () => get<PressRelease[]>("/press/");
export const getDocuments = (category?: string) => get<DocumentItem[]>("/documents/", { category });
export const getAwardCategories = () => get<RefItem[]>("/awards/categories/");
export const getVolunteerMissions = () => get<RefItem[]>("/volunteers/missions/");
