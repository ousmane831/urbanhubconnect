from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from apps.core.admin import GOLD, GREEN, GREY, PURPLE, RED, TaxonomyAdmin, badge
from .models import College, Commission, Organization, Sector, ValidationStatus as VS

STATUS_COLORS = {VS.PENDING: GOLD, VS.REVIEWING: PURPLE, VS.ACCEPTED: GREEN, VS.REJECTED: RED}


@admin.register(College)
class CollegeAdmin(TaxonomyAdmin):
    pass


@admin.register(Sector)
class SectorAdmin(TaxonomyAdmin):
    pass


@admin.register(Commission)
class CommissionAdmin(TaxonomyAdmin):
    list_display = ("number", "name", "display_order", "is_active")
    ordering = ("number",)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "college", "pole", "validation_badge", "publication", "member_founder", "created_at")
    list_filter = ("validation_status", "is_published", "pole", "college", "sector", "commissions",
                  "member_founder", "membership_status")
    search_fields = ("name", "neighborhood", "description", "representative_name", "email")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("college",)
    filter_horizontal = ("commissions",)
    readonly_fields = ("logo_preview", "osm_link", "reviewed_at", "reviewed_by", "created_at", "updated_at")
    actions = ["mark_reviewing", "accept", "reject", "publish", "unpublish"]
    prepopulated_fields = {"slug": ("name",)}
    fieldsets = (
        ("Validation et publication", {"fields": ("validation_status", "is_published", "member_founder",
                                                  "membership_status", "review_notes", "reviewed_by", "reviewed_at")}),
        ("Identité (public)", {"fields": ("name", "slug", "logo", "logo_preview", "college", "sector", "commissions", "pole")}),
        ("Présentation et réseaux (public)", {"fields": ("description", "website", "linkedin", "facebook", "instagram")}),
        ("Localisation (public)", {"fields": ("neighborhood", "address", "latitude", "longitude", "osm_link")}),
        ("🔒 Informations PRIVÉES — jamais exposées publiquement", {
            "fields": ("phone", "email", "representative_name", "representative_role",
                       "representative_phone", "representative_email", "offers", "needs")}),
        ("Dates", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Validation", ordering="validation_status")
    def validation_badge(self, obj):
        return badge(obj.get_validation_status_display(), STATUS_COLORS[obj.validation_status])

    @admin.display(description="Publication", ordering="is_published")
    def publication(self, obj):
        return badge("Publiée", GREEN) if obj.is_published else badge("Masquée", GREY)

    @admin.display(description="Aperçu du logo")
    def logo_preview(self, obj):
        return format_html('<img src="{}" style="max-height:80px;max-width:200px">', obj.logo.url) if obj.logo else "—"

    @admin.display(description="Voir sur la carte")
    def osm_link(self, obj):
        if obj.latitude is None:
            return "—"
        return format_html('<a href="https://www.openstreetmap.org/?mlat={0}&mlon={1}#map=17/{0}/{1}" target="_blank" rel="noopener">OpenStreetMap ↗</a>',
                           obj.latitude, obj.longitude)

    def save_model(self, request, obj, form, change):
        if "validation_status" in form.changed_data:
            obj.reviewed_at, obj.reviewed_by = timezone.now(), request.user
        super().save_model(request, obj, form, change)

    def _review(self, request, queryset, status, label):
        fields = {"validation_status": status, "reviewed_at": timezone.now(),
                  "reviewed_by": request.user, "updated_at": timezone.now()}
        if status != VS.ACCEPTED:
            fields["is_published"] = False
        n = queryset.update(**fields)
        self.message_user(request, f"{n} fiche(s) {label}.")

    @admin.action(description="Passer en « en cours d'examen »")
    def mark_reviewing(self, request, queryset):
        self._review(request, queryset, VS.REVIEWING, "en cours d'examen")

    @admin.action(description="Accepter (sans publier)")
    def accept(self, request, queryset):
        self._review(request, queryset, VS.ACCEPTED, "acceptée(s) — non publiée(s) tant que vous ne les publiez pas")

    @admin.action(description="Refuser (et masquer)")
    def reject(self, request, queryset):
        self._review(request, queryset, VS.REJECTED, "refusée(s) et masquée(s)")

    @admin.action(description="Publier (fiches acceptées uniquement)")
    def publish(self, request, queryset):
        ok = queryset.filter(validation_status=VS.ACCEPTED)
        skipped = queryset.count() - ok.count()
        n = ok.update(is_published=True, updated_at=timezone.now())
        self.message_user(request, f"{n} fiche(s) publiée(s).")
        if skipped:
            self.message_user(request, f"{skipped} fiche(s) ignorée(s) : elles doivent d'abord être acceptées.", messages.WARNING)

    @admin.action(description="Dépublier (masquer)")
    def unpublish(self, request, queryset):
        n = queryset.update(is_published=False, updated_at=timezone.now())
        self.message_user(request, f"{n} fiche(s) masquée(s).")
