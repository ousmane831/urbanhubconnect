from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import PageContent, SiteSettings

GREEN, GOLD, PURPLE, RED, GREY = "#1E5C3F", "#C39A3E", "#4E2A84", "#9B2C2C", "#6B7280"


def badge(label, color):
    return format_html(
        '<span style="background:{};color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;white-space:nowrap">{}</span>',
        color, label)


class PublishActionsMixin:
    actions = ["publish", "unpublish"]

    @admin.display(description="Publication", ordering="is_published")
    def publication(self, obj):
        return badge("Publié", GREEN) if obj.is_published else badge("Masqué", GREY)

    @admin.action(description="Publier la sélection")
    def publish(self, request, queryset):
        n = queryset.update(is_published=True, updated_at=timezone.now())
        self.message_user(request, f"{n} élément(s) publié(s).")

    @admin.action(description="Dépublier (masquer) la sélection")
    def unpublish(self, request, queryset):
        n = queryset.update(is_published=False, updated_at=timezone.now())
        self.message_user(request, f"{n} élément(s) masqué(s).")


class TaxonomyAdmin(admin.ModelAdmin):
    list_display = ("name", "display_order", "is_active")
    list_editable = ("display_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("display_order", "name")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PageContent)
class PageContentAdmin(PublishActionsMixin, admin.ModelAdmin):
    list_display = ("title", "slug", "publication", "updated_at")
    list_filter = ("is_published",)
    search_fields = ("title", "content")
    ordering = ("title",)
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")


STATUS_COLORS = {"pending": GOLD, "reviewing": PURPLE, "accepted": GREEN, "rejected": RED}


class SubmissionAdminMixin:
    """Gestion de statut commune aux demandes (adhésion, partenariat, accréditation…).
    Les sous-classes déclarent list_filter = ("status", ...) et list_display avec "status_badge"."""
    actions = ["mark_reviewing", "accept", "reject"]
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return badge(obj.get_status_display(), STATUS_COLORS[obj.status])

    def _set_status(self, request, queryset, status, label):
        n = queryset.update(status=status, updated_at=timezone.now())
        self.message_user(request, f"{n} demande(s) {label}.")

    @admin.action(description="Passer en « en cours d'examen »")
    def mark_reviewing(self, request, queryset):
        self._set_status(request, queryset, "reviewing", "en cours d'examen")

    @admin.action(description="Accepter")
    def accept(self, request, queryset):
        self._set_status(request, queryset, "accepted", "acceptée(s)")

    @admin.action(description="Refuser")
    def reject(self, request, queryset):
        self._set_status(request, queryset, "rejected", "refusée(s)")
