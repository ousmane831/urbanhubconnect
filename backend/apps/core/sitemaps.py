from django.contrib.sitemaps import Sitemap

from apps.events.models import Event
from apps.news.models import Article
from apps.organizations.models import Organization

STATIC_PATHS = ["/", "/le-reseau", "/nos-actions", "/annuaire", "/cartographie", "/evenements", "/adherer",
                "/partenaires", "/actualites", "/presse", "/contact", "/mentions-legales", "/confidentialite"]


class StaticSitemap(Sitemap):
    priority, changefreq = 0.7, "weekly"

    def items(self):
        return STATIC_PATHS

    def location(self, item):
        return item


class OrganizationSitemap(Sitemap):
    priority, changefreq = 0.5, "monthly"

    def items(self):
        return Organization.objects.public()  # jamais de fiche non publiée

    def location(self, obj):
        return f"/annuaire/{obj.slug}"

    def lastmod(self, obj):
        return obj.updated_at


class EventSitemap(Sitemap):
    priority, changefreq = 0.8, "weekly"

    def items(self):
        return Event.objects.public()

    def location(self, obj):
        return f"/evenements/{obj.slug}"

    def lastmod(self, obj):
        return obj.updated_at


class ArticleSitemap(Sitemap):
    priority, changefreq = 0.6, "monthly"

    def items(self):
        return Article.objects.public()

    def location(self, obj):
        return f"/actualites/{obj.slug}"

    def lastmod(self, obj):
        return obj.updated_at


SITEMAPS = {"static": StaticSitemap, "organizations": OrganizationSitemap, "events": EventSitemap, "articles": ArticleSitemap}
