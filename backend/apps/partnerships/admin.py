from django.contrib import admin

from apps.core.admin import SubmissionAdminMixin, TaxonomyAdmin
from .models import Partner, PartnershipApplication, PartnershipTier


@admin.register(PartnershipTier)
class PartnershipTierAdmin(TaxonomyAdmin):
    list_display = ("name", "amount_fcfa", "display_order", "is_active")
    list_editable = ("amount_fcfa", "display_order", "is_active")


@admin.register(PartnershipApplication)
class PartnershipApplicationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("company", "tier", "contact_name", "phone", "status_badge", "created_at")
    list_filter = ("status", "tier")
    search_fields = ("company", "contact_name", "email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "partnership_type", "is_confirmed", "display_order")
    list_editable = ("is_confirmed", "display_order")
    list_filter = ("is_confirmed", "partnership_type")
    search_fields = ("name",)
