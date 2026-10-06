from django_filters import rest_framework as django_filters
from django.utils import timezone
from rest_framework import generics, serializers, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.documents.models import Document
from apps.events.models import AwardCategory, Event, EventCategory, VolunteerMission
from apps.memberships.models import MembershipCategory
from apps.news.models import Article, ArticleCategory
from apps.partnerships.models import Partner, PartnershipTier
from apps.press.models import PressRelease
from .models import PageContent, SiteSettings


def ser(model, fields, **declared):
    meta = type("Meta", (), {"model": model, "fields": fields})
    return type(f"{model.__name__}ReadSerializer", (serializers.ModelSerializer,), {**declared, "Meta": meta})


cat = lambda: serializers.SlugRelatedField(slug_field="slug", read_only=True)
cat_name = lambda: serializers.CharField(source="category.name", read_only=True)

SiteSettingsSer = ser(SiteSettings, ["site_name", "phone", "whatsapp", "email", "address", "linkedin", "facebook",
                                     "instagram", "footer_text", "legal_information", "privacy_policy"])
PageSer = ser(PageContent, ["title", "slug", "meta_title", "meta_description", "content", "updated_at"])
MembershipSer = ser(MembershipCategory, ["name", "slug", "description", "amount_fcfa"])
TierSer = ser(PartnershipTier, ["name", "slug", "description", "amount_fcfa", "benefits"])
PartnerSer = ser(Partner, ["name", "logo", "website", "partnership_type"], partnership_type=serializers.StringRelatedField())
EVENT_FIELDS = ["title", "slug", "category", "category_name", "description", "audience", "start_date", "end_date",
                "location", "image", "registration_url", "registration_opens_at", "is_featured"]
EventSer = ser(Event, EVENT_FIELDS, category=cat(), category_name=cat_name())
EventDetailSer = ser(Event, EVENT_FIELDS + ["sections"], category=cat(), category_name=cat_name(),
                     sections=serializers.SerializerMethodField(),
                     get_sections=lambda self, obj: [{"slug": s.slug, "title": s.title, "body": s.body}
                                                     for s in obj.sections.filter(is_published=True)])
ArticleSer = ser(Article, ["title", "slug", "category", "category_name", "excerpt", "content", "featured_image", "author",
                           "published_at", "meta_title", "meta_description"], category=cat(), category_name=cat_name())
DocumentSer = ser(Document, ["title", "file", "category", "description"])
PressSer = ser(PressRelease, ["title", "slug", "summary", "document", "published_at"])


class SiteSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(SiteSettingsSer(SiteSettings.load()).data)


class ReadOnly(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    lookup_field = "slug"


class PageViewSet(ReadOnly):
    serializer_class = PageSer
    pagination_class = None

    def get_queryset(self):
        return PageContent.objects.filter(is_published=True)


class EventFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug")
    upcoming = django_filters.BooleanFilter(method="filter_upcoming")

    def filter_upcoming(self, qs, name, value):
        now = timezone.now()
        return qs.filter(start_date__gte=now) if value else qs.filter(start_date__lt=now)

    class Meta:
        model = Event
        fields = ["is_featured"]


class EventViewSet(ReadOnly):
    filterset_class = EventFilter
    search_fields = ["title", "location", "description"]

    def get_serializer_class(self):
        return EventDetailSer if self.action == "retrieve" else EventSer

    def get_queryset(self):
        return Event.objects.public().select_related("category")


class ArticleViewSet(ReadOnly):
    serializer_class = ArticleSer
    filterset_fields = {"category__slug": ["exact"]}
    search_fields = ["title", "excerpt"]

    def get_queryset(self):
        return Article.objects.public().select_related("category")


class DocumentList(generics.ListAPIView):
    permission_classes, serializer_class, pagination_class = [AllowAny], DocumentSer, None
    filterset_fields = ["category"]
    queryset = Document.objects.public()


class PressList(generics.ListAPIView):
    permission_classes, serializer_class, pagination_class = [AllowAny], PressSer, None
    queryset = PressRelease.objects.public()


class MembershipCategoryList(generics.ListAPIView):
    permission_classes, serializer_class, pagination_class = [AllowAny], MembershipSer, None
    queryset = MembershipCategory.objects.filter(is_active=True)


class TierList(generics.ListAPIView):
    permission_classes, serializer_class, pagination_class = [AllowAny], TierSer, None
    queryset = PartnershipTier.objects.filter(is_active=True)


class PartnerList(generics.ListAPIView):
    """Liste vide tant qu'aucun partenaire n'est confirmé : le front masque alors le bloc."""
    permission_classes, serializer_class, pagination_class = [AllowAny], PartnerSer, None
    queryset = Partner.objects.confirmed()


TaxonomySer = lambda m: ser(m, ["name", "slug", "description"])


def taxonomy_list(model, extra=()):
    fields = ["name", "slug", "description", *extra]
    return type(f"{model.__name__}List", (generics.ListAPIView,), {
        "permission_classes": [AllowAny], "pagination_class": None,
        "serializer_class": ser(model, fields), "queryset": model.objects.filter(is_active=True)}).as_view()


EventCategoryList = taxonomy_list(EventCategory)
ArticleCategoryList = taxonomy_list(ArticleCategory)
AwardCategoryList = taxonomy_list(AwardCategory, ("criteria",))
VolunteerMissionList = taxonomy_list(VolunteerMission)
