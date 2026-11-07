from django import forms
from django.contrib import admin, messages

from apps.core.admin import GOLD, GREEN, GREY, PURPLE, RED, SubmissionAdminMixin, TaxonomyAdmin, badge
from . import services
from . import accounts
from . import network
from .models import ConnectionRequest, ContactReveal, Membership, Opportunity, OpportunityType, MembershipApplication, MembershipCategory, Payment, ProfileChange

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
    fields = ("paid_on", "amount_fcfa", "method", "reference", "notes", "applied", "cancelled", "recorded_by")
    readonly_fields = ("applied", "cancelled", "recorded_by")

    def has_change_permission(self, request, obj=None):
        return False  # un paiement enregistré ne se modifie pas : on en ajoute un autre

    def has_delete_permission(self, request, obj=None):
        return False


class MembershipForm(forms.ModelForm):
    class Meta:
        model = Membership
        fields = "__all__"

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()
        m = self.instance
        if m.pk and m.user_id and email and email != m.user.email.lower():
            from apps.users.models import User
            if User.objects.filter(email__iexact=email).exclude(pk=m.user_id).exists():
                raise forms.ValidationError("Cette adresse est déjà utilisée par un autre compte.")
        return email

    def clean_organization(self):
        org = self.cleaned_data.get("organization")
        if org is not None and Membership.objects.filter(organization=org).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("Cette fiche est déjà rattachée à un autre dossier.")
        return org


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    form = MembershipForm
    list_display = ("reference", "name", "category", "status_badge", "is_founder", "valid_until", "organization")
    list_filter = ("status", "category", "is_founder")
    search_fields = ("reference", "name", "representative", "email")
    date_hierarchy = "created_at"
    list_select_related = ("category", "organization")
    inlines = [PaymentInline]
    # Le statut ne se change que par les actions (elles vérifient la transition et mettent la fiche à jour).
    readonly_fields = ("reference", "status", "user", "activated_at", "valid_until", "charter_sent_at", "is_founder", "created_at", "updated_at")
    autocomplete_fields = ("organization",)
    actions = ["do_review", "do_accept", "do_reject", "do_bulletin", "do_suspend", "do_reinstate", "do_expire", "do_invite"]
    fieldsets = (
        ("Dossier", {"fields": ("reference", "status", "name", "category", "organization", "application", "user")}),
        ("Demandeur", {"fields": ("representative", "role", "phone", "email")}),
        ("Cotisation", {"fields": ("charter_sent_at", "charter_signed_on", "activated_at", "valid_until", "is_founder")}),
        ("Notes", {"fields": ("notes",)}),
    )

    @admin.display(description="Statut", ordering="status")
    def status_badge(self, obj):
        return badge(obj.get_status_display(), COLORS[obj.status])

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and "email" in form.changed_data:
            try:
                accounts.sync_user_email(obj)
                if obj.user_id:
                    self.message_user(request, f"L'identifiant de connexion du membre est maintenant {obj.email}.")
            except accounts.AccountError as e:
                self.message_user(request, str(e), messages.WARNING)
        if {"organization", "category"} & set(form.changed_data):
            if "organization" in form.changed_data and form.initial.get("organization"):
                from apps.organizations.models import MembershipStatus, Organization
                Organization.objects.filter(pk=form.initial["organization"]).update(  # l'ancienne fiche n'est plus celle d'un adhérent
                    is_published=False, membership_status=MembershipStatus.NONE, member_founder=False)
            services.sync_organization(obj)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for payment in instances:
            if payment.pk is None:
                m = payment.membership
                try:
                    warning = services.check_payment(m, amount=payment.amount_fcfa, method=payment.method,
                                                     reference=payment.reference, paid_on=payment.paid_on)
                except services.DossierError as e:
                    self.message_user(request, f"Paiement non enregistré : {e}", messages.ERROR)
                    continue
                payment.recorded_by = request.user
                payment.save()
                self.message_user(request, services.settle(m) + warning)
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

    @admin.action(description="Constater les échéances et envoyer les rappels (tous les dossiers)")
    def do_expire(self, request, queryset):
        r = services.daily_maintenance()
        self.message_user(request, f"{r['expired']} cotisation(s) passée(s) en « échue », {r['reminders']} rappel(s) d'échéance envoyé(s).")

    @admin.action(description="Envoyer ou renvoyer l'invitation à l'Espace membres (membres à jour)")
    def do_invite(self, request, queryset):
        for m in queryset.filter(status=S.ACTIVE):
            try:
                user, _ = accounts.ensure_account(m)
                sent = accounts.send_invitation(m, user, resend=user.has_usable_password())
                self.message_user(request, f"{m.name} : invitation {'envoyée' if sent else 'non envoyée (e-mail impossible)'}.",
                                  messages.SUCCESS if sent else messages.WARNING)
            except accounts.AccountError as e:
                self.message_user(request, f"{m.name} : {e}", messages.WARNING)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Journal des paiements. Un paiement ne se modifie ni ne se supprime : on l'annule (il reste visible) et la cotisation est recalculée."""
    list_display = ("membership", "paid_on", "amount_fcfa", "method", "reference", "applied", "cancelled", "recorded_by")
    list_filter = ("method", "applied", "cancelled")
    search_fields = ("membership__reference", "membership__name", "reference")
    date_hierarchy = "paid_on"
    readonly_fields = ("membership", "paid_on", "amount_fcfa", "method", "reference", "notes", "applied", "recorded_by",
                       "cancelled", "cancelled_at", "cancelled_by", "created_at", "updated_at")
    actions = ["do_cancel"]

    def has_add_permission(self, request):
        return False  # un paiement s'enregistre depuis le dossier

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description="Annuler (erreur de saisie) et recalculer la cotisation")
    def do_cancel(self, request, queryset):
        for p in queryset:
            try:
                self.message_user(request, f"{p.membership} : {services.cancel_payment(p, request.user)}")
            except services.DossierError as e:
                self.message_user(request, f"{p.membership} : {e}", messages.WARNING)


@admin.register(ProfileChange)
class ProfileChangeAdmin(admin.ModelAdmin):
    list_display = ("organization", "status", "requested_by", "created_at", "reviewed_by")
    list_filter = ("status",)
    search_fields = ("organization__name",)
    readonly_fields = ("organization", "requested_by", "changes", "logo", "status", "reviewed_by", "reviewed_at", "created_at", "updated_at")
    actions = ["approve", "reject"]

    def has_add_permission(self, request):
        return False

    def _each(self, request, queryset, fn, ok):
        for c in queryset:
            try:
                fn(c, request.user)
                self.message_user(request, f"{c.organization} : {ok}.")
            except accounts.AccountError as e:
                self.message_user(request, f"{c.organization} : {e}", messages.WARNING)

    @admin.action(description="Approuver et publier")
    def approve(self, request, queryset):
        self._each(request, queryset, accounts.approve_change, "modification appliquée")

    @admin.action(description="Refuser")
    def reject(self, request, queryset):
        self._each(request, queryset, accounts.reject_change, "modification refusée")


@admin.register(ContactReveal)
class ContactRevealAdmin(admin.ModelAdmin):
    """Journal d'audit en lecture seule : qui a consulté les coordonnées de qui, et quand."""
    list_display = ("member", "organization", "created_at")
    search_fields = ("member__email", "organization__name")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OpportunityType)
class OpportunityTypeAdmin(TaxonomyAdmin):
    pass


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "type", "status", "deadline", "published_at")
    list_filter = ("status", "type")
    search_fields = ("title", "description", "organization__name")
    date_hierarchy = "created_at"
    readonly_fields = ("organization", "published_by", "published_at", "reviewed_by", "reviewed_at", "created_at", "updated_at")
    actions = ["approve", "reject", "close"]

    def has_add_permission(self, request):
        return False  # les annonces sont publiées par les membres

    def _each(self, request, queryset, fn, ok, with_user=True):
        for o in queryset:
            try:
                fn(o, request.user) if with_user else fn(o)
                self.message_user(request, f"« {o.title} » : {ok}.")
            except network.NetworkError as e:
                self.message_user(request, f"« {o.title} » : {e}", messages.WARNING)

    @admin.action(description="Valider et publier")
    def approve(self, request, queryset):
        self._each(request, queryset, network.approve_opportunity, "publiée")

    @admin.action(description="Refuser")
    def reject(self, request, queryset):
        self._each(request, queryset, network.reject_opportunity, "refusée")

    @admin.action(description="Clôturer")
    def close(self, request, queryset):
        self._each(request, queryset, network.close_opportunity, "clôturée", with_user=False)


@admin.register(ConnectionRequest)
class ConnectionRequestAdmin(admin.ModelAdmin):
    list_display = ("sender", "recipient", "opportunity", "status", "created_at", "forwarded_at")
    list_filter = ("status",)
    search_fields = ("sender__name", "recipient__name", "message")
    date_hierarchy = "created_at"
    readonly_fields = ("sender", "recipient", "opportunity", "message", "status", "handled_by", "handled_at", "forwarded_at", "created_at", "updated_at")
    actions = ["do_forward", "do_decline"]

    def has_add_permission(self, request):
        return False

    def _each(self, request, queryset, fn, ok):
        for r in queryset:
            try:
                fn(r, request.user)
                self.message_user(request, f"{r} : {ok}.")
            except network.NetworkError as e:
                self.message_user(request, f"{r} : {e}", messages.WARNING)

    @admin.action(description="Transmettre à l'organisation")
    def do_forward(self, request, queryset):
        self._each(request, queryset, network.forward, "transmise")

    @admin.action(description="Refuser")
    def do_decline(self, request, queryset):
        self._each(request, queryset, network.decline, "refusée")
