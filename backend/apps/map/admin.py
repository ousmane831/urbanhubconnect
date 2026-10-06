from django.contrib import admin
from django.utils.html import format_html

from django.contrib import messages
from apps.core.admin import PublishActionsMixin, SubmissionAdminMixin, TaxonomyAdmin
from .models import MapCategory, MapPlace, PlaceSuggestion


@admin.register(MapCategory)
class MapCategoryAdmin(TaxonomyAdmin):
    list_display = ("name", "icon", "display_order", "is_active")


@admin.register(MapPlace)
class MapPlaceAdmin(PublishActionsMixin, admin.ModelAdmin):
    list_display = ("name", "category", "pole", "organization", "publication", "updated_at")
    list_filter = ("is_published", "category", "pole")
    search_fields = ("name", "address", "organization__name")
    ordering = ("category", "name")
    list_select_related = ("category", "organization")
    autocomplete_fields = ("organization",)
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("image_preview", "osm_link", "created_at", "updated_at")
    fieldsets = (
        ("Publication", {"fields": ("is_published",)}),
        ("Lieu", {"fields": ("name", "slug", "category", "organization", "pole", "description", "image", "image_preview")}),
        ("Localisation", {"fields": ("address", "latitude", "longitude", "osm_link"),
                          "description": "Laissez vide pour reprendre l'adresse et les coordonnées de l'organisation liée."}),
        ("Contact et horaires", {"fields": ("phone", "email", "website", "opening_hours")}),
        ("Dates", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Aperçu")
    def image_preview(self, obj):
        return format_html('<img src="{}" style="max-height:100px">', obj.image.url) if obj.image else "—"

    @admin.display(description="Voir sur la carte")
    def osm_link(self, obj):
        if obj.latitude is None:
            return "—"
        return format_html('<a href="https://www.openstreetmap.org/?mlat={0}&mlon={1}#map=17/{0}/{1}" target="_blank" rel="noopener">OpenStreetMap ↗</a>',
                           obj.latitude, obj.longitude)


@admin.register(PlaceSuggestion)
class PlaceSuggestionAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("name", "category", "submitter_name", "status_badge", "created_at")
    list_filter = ("status", "category")
    search_fields = ("name", "address", "submitter_name", "submitter_email")
    readonly_fields = ("created_at", "updated_at")
    actions = SubmissionAdminMixin.actions + ["create_place"]

    @admin.action(description="Créer un lieu (brouillon masqué) à partir de la suggestion")
    def create_place(self, request, queryset):
        total, created = queryset.count(), 0
        for s in queryset.exclude(latitude=None).exclude(longitude=None):
            MapPlace.objects.create(name=s.name, category=s.category, address=s.address, latitude=s.latitude, longitude=s.longitude,
                                    description=s.description, website=s.website, phone=s.phone, email=s.email,
                                    opening_hours=s.opening_hours, image=s.photo.name if s.photo else "", is_published=False)
            s.status = "accepted"
            s.save(update_fields=["status", "updated_at"])
            created += 1
        self.message_user(request, f"{created} lieu(x) créé(s) en brouillon : vérifiez-les puis publiez-les.")
        if total > created:
            self.message_user(request, f"{total - created} suggestion(s) sans coordonnées ignorée(s).", messages.WARNING)
