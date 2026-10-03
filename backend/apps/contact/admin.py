from django.contrib import admin

from apps.core.admin import GREEN, GOLD, badge
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "email", "handled", "email_sent", "created_at")
    list_filter = ("is_handled", "subject", "email_sent")
    search_fields = ("name", "email", "organization", "message")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    actions = ["mark_handled", "mark_unhandled"]
    readonly_fields = ("name", "organization", "phone", "email", "subject", "message", "consent", "email_sent", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False  # les messages ne viennent que du formulaire public

    @admin.display(description="Traitement", ordering="is_handled")
    def handled(self, obj):
        return badge("Traité", GREEN) if obj.is_handled else badge("À traiter", GOLD)

    @admin.action(description="Marquer comme traité")
    def mark_handled(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_handled=True)} message(s) traité(s).")

    @admin.action(description="Marquer comme à traiter")
    def mark_unhandled(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_handled=False)} message(s) rouvert(s).")
