from django.contrib import admin

from apps.core.admin import PublishActionsMixin, SubmissionAdminMixin, TaxonomyAdmin
from .models import (AwardApplication, AwardCategory, BusinessConnectRegistration, Event, EventCategory,
                     VolunteerApplication, VolunteerMission)


@admin.register(EventCategory)
class EventCategoryAdmin(TaxonomyAdmin):
    pass


@admin.register(Event)
class EventAdmin(PublishActionsMixin, admin.ModelAdmin):
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
