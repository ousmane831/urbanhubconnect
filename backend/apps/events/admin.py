from django.contrib import admin

from apps.core.admin import PublishActionsMixin, SubmissionAdminMixin, TaxonomyAdmin
from .models import (CheckIn, EventRequest, EventSection, AwardApplication, AwardCategory, BusinessConnectRegistration, Event, EventCategory,
                     VolunteerApplication, VolunteerMission)


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
    pass


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
    list_display = ("name", "kind", "organization", "email", "status_badge", "badge_envoye", "arrivees", "created_at")
    list_filter = ("status", "kind")
    search_fields = ("name", "organization", "email", "phone")
    readonly_fields = ("created_at", "updated_at", "choix", "badge_sent_at", "lien_badge")
    inlines = [CheckInInline]
    actions = ["send_badges"]

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
        url = badges.badge_url(obj)
        return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>', url, url)

    @admin.action(description="Envoyer ou renvoyer le badge (QR code) par e-mail")
    def send_badges(self, request, queryset):
        from django.contrib import messages
        from . import badges
        sent = failed = 0
        for r in queryset.filter(kind__in=EventRequest.BADGE_KINDS).exclude(status="rejected"):
            if badges.send_badge(r):
                sent += 1
            else:
                failed += 1
        note = f" {failed} envoi(s) impossible(s) : vérifiez les adresses et la configuration d'envoi." if failed else ""
        self.message_user(request, f"{sent} badge(s) envoyé(s).{note}", messages.WARNING if failed else messages.SUCCESS)

    @admin.display(description="choix d'inscription")
    def choix(self, obj):
        return " ; ".join(obj.options_display()) or "—"
