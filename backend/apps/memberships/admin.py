from django.contrib import admin

from apps.core.admin import SubmissionAdminMixin, TaxonomyAdmin
from .models import MembershipApplication, MembershipCategory


@admin.register(MembershipCategory)
class MembershipCategoryAdmin(TaxonomyAdmin):
    list_display = ("name", "amount_fcfa", "display_order", "is_active")
    list_editable = ("amount_fcfa", "display_order", "is_active")


@admin.register(MembershipApplication)
class MembershipApplicationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("organization_or_name", "category", "pole", "representative", "email", "status_badge", "created_at")
    list_filter = ("status", "category", "pole", "college")
    search_fields = ("organization_or_name", "representative", "email")
    filter_horizontal = ("commissions",)
    readonly_fields = ("created_at", "updated_at")
