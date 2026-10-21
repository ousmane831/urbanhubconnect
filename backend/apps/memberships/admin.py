from django.contrib import admin, messages

from apps.core.admin import GOLD, GREEN, GREY, PURPLE, RED, SubmissionAdminMixin, TaxonomyAdmin, badge
from . import services
from .models import Membership, MembershipApplication, MembershipCategory, Payment

S = Membership.Status
COLORS = {S.RECEIVED: GOLD, S.REVIEWING: PURPLE, S.ACCEPTED: GOLD, S.ACTIVE: GREEN, S.EXPIRED: RED, S.SUSPENDED: GREY, S.REJECTED: RED}


@admin.register(MembershipCategory)
class MembershipCategoryAdmin(TaxonomyAdmin):
    list_display = ("name", "amount_fcfa", "public_listing", "display_order", "is_active")
    list_editable = ("amount_fcfa", "public_listing", "display_order", "is_active")


@admin.register(MembershipApplication)
class MembershipApplicationAdmin(SubmissionAdminMixin, admin.ModelAdmin):
    list_display = ("organization_or_name", "category", "pole", "representative", "email", "status_badge", "created_at")
    list_filter = ("status", "category", "pole", "college")
    search_fields = ("organization_or_name", "representative", "email")
    filter_horizontal = ("commissions",)
    readonly_fields = ("created_at", "updated_at")


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    fields = ("paid_on", "amount_fcfa", "method", "reference", "notes", "applied", "recorded_by")
    readonly_fields = ("applied", "recorded_by")

    def has_change_permission(self, request, obj=None):
        return False  # un paiement enregistré ne se modifie pas : on en ajoute un autre

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("reference", "name", "category", "status_badge", "is_founder", "valid_until", "organization")
    list_filter = ("status", "category", "is_founder")
    search_fields = ("reference", "name", "representative", "email")
    date_hierarchy = "created_at"
    list_select_related = ("category", "organization")
    inlines = [PaymentInline]
    readonly_fields = ("reference", "activated_at", "valid_until", "charter_sent_at", "is_founder", "created_at", "updated_at")
    autocomplete_fields = ("organization",)
    actions = ["do_review", "do_accept", "do_reject", "do_bulletin", "do_suspend", "do_reinstate", "do_expire"]
    fieldsets = (
        ("Dossier", {"fields": ("reference", "status", "name", "category", "organization", "application")}),
        ("Demandeur", {"fields": ("representative", "role", "phone", "email")}),
        ("Cotisation", {"fields": ("charter_sent_at", "charter_signed_on", "activated_at", "valid_until", "is_founder")}),
        ("Notes", {"fields": ("notes",)}),
    )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return badge(obj.get_status_display(), COLORS[obj.status])

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for payment in instances:
            if payment.pk is None:
                payment.recorded_by = request.user
                payment.save()
                self.message_user(request, services.settle(payment.membership))
        formset.save_m2m()

    def _each(self, request, queryset, fn, ok):
        done = 0
        for m in queryset:
            try:
                fn(m)
                done += 1
            except services.DossierError as e:
                self.message_user(request, f"{m.name} : {e}", messages.WARNING)
        if done:
            self.message_user(request, f"{done} dossier(s) : {ok}.")

    @admin.action(description="Passer en « en cours d'examen »")
    def do_review(self, request, queryset):
        self._each(request, queryset, services.review, "en cours d'examen")

    @admin.action(description="Accepter la demande")
    def do_accept(self, request, queryset):
        self._each(request, queryset, services.accept, "acceptés")

    @admin.action(description="Refuser")
    def do_reject(self, request, queryset):
        self._each(request, queryset, services.reject, "refusés")

    @admin.action(description="Envoyer le bulletin et la Charte par e-mail")
    def do_bulletin(self, request, queryset):
        self._each(request, queryset, services.send_bulletin, "bulletin enregistré comme envoyé")

    @admin.action(description="Suspendre (retire la fiche de l'Annuaire)")
    def do_suspend(self, request, queryset):
        self._each(request, queryset, services.suspend, "suspendus")

    @admin.action(description="Réactiver")
    def do_reinstate(self, request, queryset):
        self._each(request, queryset, services.reinstate, "réactivés")

    @admin.action(description="Constater les cotisations échues (tous les dossiers)")
    def do_expire(self, request, queryset):
        self.message_user(request, f"{services.expire_overdue()} cotisation(s) passée(s) en « échue ».")
