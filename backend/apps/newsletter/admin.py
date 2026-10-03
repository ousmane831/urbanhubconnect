import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import NewsletterSubscriber


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "organization", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("email", "name", "organization")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    actions = ["export_csv", "deactivate"]

    @admin.action(description="Exporter la sélection en CSV")
    def export_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="newsletter.csv"'
        writer = csv.writer(response)
        writer.writerow(["email", "nom", "organisation", "inscrit le"])
        for s in queryset:
            writer.writerow([s.email, s.name, s.organization, s.created_at.date()])
        return response

    @admin.action(description="Désactiver (désabonner)")
    def deactivate(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_active=False)} abonné(s) désactivé(s).")
