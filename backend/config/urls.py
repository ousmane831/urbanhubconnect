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
from apps.map.api import MapCategoryListView, MapPlaceViewSet, route as map_route
from apps.organizations.api import OrganizationViewSet
from apps.core import coordination_api as co

from apps.core import members_network_api as mn
from apps.events import badge_api as bd
from apps.campaigns import api as cp
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
    path("api/map/route/", map_route, name="map-route"),
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
    # Badges du Grand Week-End : page « Mon badge » (publique, code secret) et accueil le jour J (Coordination)
    path("api/badges/<str:token>/", bd.badge_detail, name="badge-detail"),
    path("api/badges/<str:token>/qr.png", bd.badge_qr, name="badge-qr"),
    path("api/badges/<str:token>/badge.png", bd.badge_image, name="badge-image"),
    path("api/events-planting-seats/", bd.planting_seats, name="planting-seats"),
    path("api/coordination/checkin/", bd.checkin, name="coord-checkin"),
    path("api/coordination/checkin/search/", bd.checkin_search, name="coord-checkin-search"),
    path("api/coordination/checkin/resend/", bd.checkin_resend, name="coord-checkin-resend"),
    path("api/coordination/checkin/stats/", bd.checkin_stats, name="coord-checkin-stats"),
    path("api/coordination/badges/print/", bd.print_list, name="coord-badges-print"),
    path("api/coordination/badges/printed/", bd.print_done, name="coord-badges-printed"),
    path("api/coordination/badges/qr.zip", bd.qr_archive, name="coord-badges-zip"),
    path("api/coordination/campaigns/", cp.overview, name="coord-campaigns"),
    path("api/coordination/campaigns/new/", cp.campaign_create, name="coord-campaign-create"),
    path("api/coordination/campaigns/preview/", cp.campaign_preview, name="coord-campaign-preview"),
    path("api/coordination/campaigns/contacts/", cp.contacts, name="coord-campaign-contacts"),
    path("api/coordination/campaigns/contacts/import/", cp.contacts_import, name="coord-campaign-import"),
    path("api/coordination/campaigns/contacts/<int:pk>/remove/", cp.contact_toggle, name="coord-campaign-contact-remove"),
    path("api/coordination/campaigns/<int:pk>/", cp.campaign_update, name="coord-campaign-update"),
    path("api/coordination/campaigns/<int:pk>/<str:action>/", cp.campaign_action, name="coord-campaign-action"),
    path("api/unsubscribe/<uuid:token>/", cp.unsubscribe, name="campaign-unsubscribe"),
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
