from django.contrib import admin

from apps.core.admin import PublishActionsMixin, SubmissionAdminMixin
from .models import PressAccreditation, PressRelease


@admin.register(PressRelease)
class PressReleaseAdmin(PublishActionsMixin, admin.ModelAdmin):
    list_display = ("title", "published_at", "publication")
    list_filter = ("is_published",)
    search_fields = ("title", "summary")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")


@admin.register(PressAccreditation)
class PressAccreditationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("name", "media", "email", "attendance_days", "status_badge", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "media", "email")
    readonly_fields = ("created_at", "updated_at")
