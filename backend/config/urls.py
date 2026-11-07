from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.http import HttpResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser

from apps.core import members_api as mb
from apps.core import content_api as c
from apps.core.sitemaps import SITEMAPS
from apps.core.forms_urls import urlpatterns as form_urls
from apps.map.api import MapCategoryListView, MapPlaceViewSet
from apps.organizations.api import OrganizationViewSet
from apps.core import coordination_api as co

from apps.core import members_network_api as mn
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
    # Documentation de l'API : réservée au personnel connecté à l'administration.
    path("api/schema/", SpectacularAPIView.as_view(authentication_classes=[SessionAuthentication], permission_classes=[IsAdminUser]), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema", authentication_classes=[SessionAuthentication],
                                                     permission_classes=[IsAdminUser]), name="docs"),
    path("api/site-settings/", c.SiteSettingsView.as_view(), name="site-settings"),
    path("api/actions/", c.ActionsView.as_view(), name="actions"),
    path("api/documents/", c.DocumentList.as_view(), name="documents"),
    path("api/press/", c.PressList.as_view(), name="press"),
    path("api/memberships/categories/", c.MembershipCategoryList.as_view(), name="membership-categories"),
    path("api/partnerships/tiers/", c.TierList.as_view(), name="partnership-tiers"),
    path("api/partnerships/partners/", c.PartnerList.as_view(), name="partners"),
    path("api/partnerships/band/", c.PartnerBandList.as_view(), name="partner-band"),
    path("api/events/categories/", c.EventCategoryList, name="event-categories"),
    path("api/articles/categories/", c.ArticleCategoryList, name="article-categories"),
    path("api/awards/categories/", c.AwardCategoryList, name="award-categories"),
    path("api/volunteers/missions/", c.VolunteerMissionList, name="volunteer-missions"),
    
    path("api/members/csrf/", co.csrf, name="member-csrf"),
    path("api/members/login/", mb.LoginView.as_view(), name="member-login"),
    path("api/members/logout/", mb.logout_view, name="member-logout"),
    path("api/members/me/", mb.me, name="member-me"),
    path("api/members/password-reset/", mb.PasswordResetRequestView.as_view(), name="member-password-reset"),
    path("api/members/set-password/", mb.SetPasswordView.as_view(), name="member-set-password"),
    path("api/members/profile/", mb.profile, name="member-profile"),
    path("api/members/listing/", mb.listing, name="member-listing"),
    path("api/members/connections/", mn.connections, name="member-connections"),
    path("api/members/opportunities/", mn.OpportunitiesView.as_view(), name="member-opportunities"),
    path("api/members/opportunities/types/", mn.OpportunityTypesView.as_view(), name="member-opportunity-types"),
    path("api/members/opportunities/<int:pk>/", mn.opportunity_update, name="member-opportunity-update"),
    path("api/members/opportunities/<int:pk>/close/", mn.opportunity_close, name="member-opportunity-close"),
    path("api/members/opportunities/<int:pk>/respond/", mn.opportunity_respond, name="member-opportunity-respond"),
    path("api/members/documents/", mn.documents, name="member-documents"),
    path("api/members/documents/<int:pk>/download/", mn.document_download, name="member-document-download"),
    path("api/members/directory/", mb.MemberDirectoryList.as_view(), name="member-directory"),
    path("api/members/directory/<slug:slug>/", mb.MemberDirectoryDetail.as_view(), name="member-directory-detail"),
    path("api/members/directory/<slug:slug>/contact/", mb.reveal_contact, name="member-reveal"),
    
    path("api/", include(form_urls)),
    path("api/", include(router.urls)),

    # b) dans urlpatterns, AVANT le path("api/", include(...)) général
    path("api/coordination/csrf/", co.csrf, name="coord-csrf"),
    path("api/coordination/login/", co.LoginView.as_view(), name="coord-login"),
    path("api/coordination/logout/", co.logout_view, name="coord-logout"),
    path("api/coordination/me/", co.me, name="coord-me"),
    path("api/coordination/summary/", co.summary, name="coord-summary"),
    path("api/coordination/queue/<str:kind>/", co.queue, name="coord-queue"),
    path("api/coordination/queue/<str:kind>/<int:pk>/<str:action>/", co.queue_action, name="coord-queue-action"),
    path("api/coordination/content/", co.content, name="coord-content"),
    path("api/coordination/content/<str:kind>/<int:pk>/<str:action>/", co.content_action, name="coord-content-action")
    ]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
