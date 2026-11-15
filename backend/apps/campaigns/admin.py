from django.contrib import admin

from .models import Campaign, Contact, Delivery


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("email", "organization", "segment", "activity", "unsubscribed_at")
    list_filter = ("segment", "activity", ("unsubscribed_at", admin.EmptyFieldListFilter))
    search_fields = ("email", "organization", "name")
    readonly_fields = ("token", "created_at", "updated_at")


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "frequency", "start_date", "end_date", "created_at")
    list_filter = ("status", "frequency")
    readonly_fields = ("status", "created_by", "activated_at", "created_at", "updated_at")


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("campaign", "contact", "occurrence", "state", "sent_at")
    list_filter = ("state", "campaign")
    search_fields = ("contact__email",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
