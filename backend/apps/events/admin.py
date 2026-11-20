from django.contrib import admin

from apps.core.admin import PublishActionsMixin, SubmissionAdminMixin, TaxonomyAdmin
from .models import (CheckIn, EventRequest, EventSection, AwardApplication, AwardCategory, BusinessConnectMeeting, BusinessConnectRegistration,
                     BusinessConnectSlot, Event, EventCategory,
                     StandRequest, VolunteerApplication, VolunteerMission)


@admin.register(EventCategory)
class EventCategoryAdmin(TaxonomyAdmin):
    pass


class EventSectionInline(admin.StackedInline):
    model = EventSection
    extra = 0
    fields = ("slug", "title", "order", "is_published", "body")


@admin.register(Event)
class EventAdmin(PublishActionsMixin, admin.ModelAdmin):
    inlines = [EventSectionInline]
    list_display = ("title", "category", "start_date", "location", "is_featured", "publication")
    list_filter = ("is_published", "is_featured", "category")
    search_fields = ("title", "location", "description")
    ordering = ("-start_date",)
    date_hierarchy = "start_date"
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")


@admin.register(AwardCategory)
class AwardCategoryAdmin(TaxonomyAdmin):
    """« candidatures jusqu'au » : vérifié pour chaque catégorie au dépôt (aucune ouverture ni fermeture implicite)."""
    list_display = ("name", "closes_on", "display_order", "is_active")
    list_editable = ("closes_on", "display_order", "is_active")


@admin.register(BusinessConnectSlot)
class BusinessConnectSlotAdmin(admin.ModelAdmin):
    """Créneaux Business Connect : ne cocher « publié » que pour un créneau approuvé par la Coordination."""
    list_display = ("__str__", "day", "start", "end", "is_published")
    list_editable = ("is_published",)
    list_filter = ("day", "is_published")


@admin.register(BusinessConnectMeeting)
class BusinessConnectMeetingAdmin(admin.ModelAdmin):
    """Consultation : les rendez-vous se créent, se confirment et se libèrent depuis l'Espace Coordination (e-mails et contrôles)."""
    list_display = ("__str__", "table", "status", "confirmed_at")
    list_filter = ("status", "slot")
    readonly_fields = ("first", "second", "slot", "table", "status", "confirmed_at", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False


@admin.register(StandRequest)
class StandRequestAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("structure", "space", "commune", "manager", "team_size", "status_badge", "created_at")
    list_filter = ("status", "space")
    search_fields = ("structure", "manager", "email", "commune")
    readonly_fields = ("created_at", "updated_at")


@admin.register(VolunteerMission)
class VolunteerMissionAdmin(TaxonomyAdmin):
    pass


@admin.register(AwardApplication)
class AwardApplicationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("applicant_name", "category", "email", "status_badge", "created_at")
    list_filter = ("status", "category")
    search_fields = ("applicant_name", "organization", "email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(BusinessConnectRegistration)
class BusinessConnectRegistrationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("participant_name", "organization", "event", "email", "status_badge", "created_at")
    list_filter = ("status", "event")
    search_fields = ("participant_name", "organization", "email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(VolunteerApplication)
class VolunteerApplicationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("name", "email", "phone", "status_badge", "created_at")
    list_filter = ("status", "missions")
    search_fields = ("name", "email", "organization")
    filter_horizontal = ("missions",)
    readonly_fields = ("created_at", "updated_at")


class CheckInInline(admin.TabularInline):
    model = CheckIn
    extra = 0
    fields = ("day", "at", "by")
    readonly_fields = ("day", "at", "by")

    def has_add_permission(self, request, obj=None):
        return False  # une arrivée s'enregistre au scan ; un scan fait par erreur peut être supprimé ici


@admin.register(EventRequest)
class EventRequestAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("reference", "name", "kind", "badge_category", "organization", "email", "status_badge", "badge_envoye", "arrivees", "created_at")
    list_filter = ("status", "kind", "badge_category")
    search_fields = ("name", "organization", "email", "phone", "badge_number")
    readonly_fields = ("created_at", "updated_at", "choix", "badge_sent_at", "lien_badge")
    inlines = [CheckInInline]
    actions = ["send_badges", "reissue_badges"]

    @admin.display(description="référence", ordering="badge_number")
    def reference(self, obj):
        from apps.core import dossiers
        return dossiers.reference(obj)

    @admin.action(description="Réémettre le badge (nouveau QR code, l'ancien n'est plus valable) et l'envoyer")
    def reissue_badges(self, request, queryset):
        from django.contrib import messages
        from . import badges
        done = 0
        for r in queryset.filter(kind__in=EventRequest.BADGE_KINDS, status="accepted"):
            badges.reissue(r)
            done += 1
        messages.success(request, f"{done} badge(s) réémis : les anciens QR codes ne sont plus valables.")

    @admin.display(description="badge", boolean=True)
    def badge_envoye(self, obj):
        return bool(obj.badge_sent_at) if obj.kind in EventRequest.BADGE_KINDS else None

    @admin.display(description="arrivées")
    def arrivees(self, obj):
        return ", ".join(f"{c.day:%d/%m}" for c in obj.checkins.all()) or "—"

    @admin.display(description="page « Mon badge »")
    def lien_badge(self, obj):
        from django.utils.html import format_html
        from . import badges
        if obj.kind not in EventRequest.BADGE_KINDS:
            return "—"
        url = badges.owner_url(obj)
        return format_html('<a href="{}" target="_blank" rel="noopener">Ouvrir le badge (lien personnel)</a>', url)

    @admin.action(description="Envoyer ou renvoyer le badge (QR code) par e-mail")
    def send_badges(self, request, queryset):
        from django.contrib import messages
        from . import badges
        sent = failed = 0
        for r in queryset.filter(kind__in=EventRequest.BADGE_KINDS, status="accepted"):
            if badges.send_badge(r):
                sent += 1
            else:
                failed += 1
        note = f" {failed} envoi(s) impossible(s) : vérifiez les adresses et la configuration d'envoi." if failed else ""
        self.message_user(request, f"{sent} badge(s) envoyé(s).{note}", messages.WARNING if failed else messages.SUCCESS)

    @admin.display(description="choix d'inscription")
    def choix(self, obj):
        return " ; ".join(obj.options_display()) or "—"
