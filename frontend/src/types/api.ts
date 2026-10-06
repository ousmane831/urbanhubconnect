export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface Taxonomy { name: string; slug: string }
export interface SiteSettings {
  site_name: string; phone: string; whatsapp: string; email: string; address: string;
  linkedin: string; facebook: string; instagram: string; footer_text: string;
  legal_information: string; privacy_policy: string;
}
export interface EventItem {
  title: string; slug: string; category: string; category_name: string; description: string; audience: string;
  start_date: string; end_date: string | null; location: string; image: string | null;
  registration_url: string; registration_opens_at: string | null; is_featured: boolean;
}
export interface EventDetail extends EventItem { sections: { slug: string; title: string; body: string }[] }
export interface PageContent { title: string; slug: string; content: string }
export interface OrganizationFilters {
  poles: { value: string; label: string }[]; colleges: Taxonomy[]; sectors: Taxonomy[]; commissions: Taxonomy[];
}

export interface OrganizationListItem {
  name: string; slug: string; logo: string | null; college: Taxonomy; sector: Taxonomy; pole: string;
  neighborhood: string; short_description: string; member_founder: boolean;
}
export interface OrganizationDetail extends OrganizationListItem {
  description: string; address: string; latitude: number | null; longitude: number | null;
  website: string; linkedin: string; facebook: string; instagram: string; commissions: Taxonomy[];
}
export interface MapCategory { name: string; slug: string; description: string; icon: string }
export interface MapPlace {
  name: string; slug: string; category: MapCategory; pole: string; description: string; address: string;
  latitude: number; longitude: number; phone: string; email: string; website: string; opening_hours: string;
  image: string | null; is_member: boolean; organization: { name: string; slug: string } | null;
}

export interface Article {
  title: string; slug: string; category: string; category_name: string; excerpt: string; content: string;
  featured_image: string | null; author: string; published_at: string; meta_title: string; meta_description: string;
}
export interface RefItem { name: string; slug: string; description: string }
export interface Priced extends RefItem { amount_fcfa: number; benefits?: string }
export interface Partner { name: string; logo: string; website: string; partnership_type: string | null }
export interface PressRelease { title: string; slug: string; summary: string; document: string | null; published_at: string }
export interface DocumentItem { title: string; file: string; category: string; description: string }
