from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.http import HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core import content_api as c
from apps.core.sitemaps import SITEMAPS
from apps.core.forms_urls import urlpatterns as form_urls
from apps.map.api import MapCategoryListView, MapPlaceViewSet
from apps.organizations.api import OrganizationViewSet

admin.site.site_header = "Urban Hub Connect · Coordination"
admin.site.site_title = "Urban Hub Connect"
admin.site.index_title = "Tableau de bord de la Coordination"

def robots(request):
    body = f"User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: {settings.SITE_URL}/sitemap.xml\n"
    return HttpResponse(body, content_type="text/plain")


router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("events", c.EventViewSet, basename="event")
router.register("articles", c.ArticleViewSet, basename="article")
router.register("pages", c.PageViewSet, basename="page")
router.register("map/places", MapPlaceViewSet, basename="mapplace")

urlpatterns = [
    path("robots.txt", robots, name="robots"),
    path("sitemap.xml", sitemap, {"sitemaps": SITEMAPS}, name="sitemap"),
    path("admin/", admin.site.urls),
    path("api/map/categories/", MapCategoryListView.as_view(), name="map-categories"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/site-settings/", c.SiteSettingsView.as_view(), name="site-settings"),
    path("api/documents/", c.DocumentList.as_view(), name="documents"),
    path("api/press/", c.PressList.as_view(), name="press"),
    path("api/memberships/categories/", c.MembershipCategoryList.as_view(), name="membership-categories"),
    path("api/partnerships/tiers/", c.TierList.as_view(), name="partnership-tiers"),
    path("api/partnerships/partners/", c.PartnerList.as_view(), name="partners"),
    path("api/events/categories/", c.EventCategoryList, name="event-categories"),
    path("api/articles/categories/", c.ArticleCategoryList, name="article-categories"),
    path("api/awards/categories/", c.AwardCategoryList, name="award-categories"),
    path("api/volunteers/missions/", c.VolunteerMissionList, name="volunteer-missions"),
    path("api/", include(form_urls)),
    path("api/", include(router.urls)),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
