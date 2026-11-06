from django.contrib import admin
from django.utils import timezone

from apps.core.admin import GREEN, GREY, badge
from .models import Document, MemberDocument


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "visibility", "created_at")
    list_filter = ("is_public", "category")
    search_fields = ("title", "description")
    ordering = ("category", "title")
    actions = ["make_public", "make_private"]
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Visibilité", ordering="is_public")
    def visibility(self, obj):
        return badge("Public", GREEN) if obj.is_public else badge("Privé", GREY)

    @admin.action(description="Rendre public")
    def make_public(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_public=True, updated_at=timezone.now())} document(s) publics.")

    @admin.action(description="Rendre privé")
    def make_private(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_public=False, updated_at=timezone.now())} document(s) privés.")


@admin.register(MemberDocument)
class MemberDocumentAdmin(admin.ModelAdmin):
    """Documents réservés aux membres à jour : stockés hors de l'accès public, servis seulement après vérification."""
    list_display = ("title", "category", "published_on", "visible")
    list_filter = ("is_published", "category")
    search_fields = ("title", "description")
    ordering = ("-published_on",)
    actions = ["publish", "unpublish"]
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Visibilité", ordering="is_published")
    def visible(self, obj):
        return badge("Visible des membres", GREEN) if obj.is_published else badge("Brouillon", GREY)

    @admin.action(description="Rendre visible des membres")
    def publish(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_published=True, updated_at=timezone.now())} document(s) visibles.")

    @admin.action(description="Retirer (brouillon)")
    def unpublish(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_published=False, updated_at=timezone.now())} document(s) retirés.")
