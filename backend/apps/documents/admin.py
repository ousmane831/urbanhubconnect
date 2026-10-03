from django.contrib import admin
from django.utils import timezone

from apps.core.admin import GREEN, GREY, badge
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "visibility", "created_at")
    list_filter = ("is_public", "category")
    search_fields = ("title", "description")
    ordering = ("category", "title")
    actions = ["make_public", "make_private"]
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Visibilité", ordering="is_public")
    def visibility(self, obj):
        return badge("Public", GREEN) if obj.is_public else badge("Privé", GREY)

    @admin.action(description="Rendre public")
    def make_public(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_public=True, updated_at=timezone.now())} document(s) publics.")

    @admin.action(description="Rendre privé")
    def make_private(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_public=False, updated_at=timezone.now())} document(s) privés.")
