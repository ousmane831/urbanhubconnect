from django.urls import path
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.contact.models import ContactMessage
from apps.events.models import (AwardApplication, AwardCategory, BusinessConnectRegistration, BusinessConnectSlot, Event, EventRequest,
                                StandRequest, VolunteerApplication, VolunteerMission)
from apps.map.models import MapCategory, PlaceSuggestion
from apps.memberships.models import MembershipApplication, MembershipCategory
from apps.newsletter.models import NewsletterSubscriber
from apps.organizations.models import College, Commission, Organization, Sector
from apps.partnerships.models import PartnershipApplication, PartnershipTier
from apps.press.models import PressAccreditation
from .forms_api import (CleanedModelSerializer, SubmissionCreateView, build_serializer, notify_contact,
                        submission_view)
from apps.memberships.services import link_org_submission, open_dossier


active = lambda m: m.objects.filter(is_active=True)
college, sector = (active(College), False), (active(Sector), False)
commissions = (active(Commission), False)
CONSENT = lambda *n: {k: serializers.BooleanField(write_only=True) for k in n}

# -- Membership
membership = build_serializer(
MembershipApplication,
[
"organization_or_name",
"category",
"college",
"sector",
"pole",
"representative",
"role",
"phone",
"email",
"commissions",
"offers",
"needs",
"accept_charter",
"accept_privacy",
],
slugs={
"category": (active(MembershipCategory), True),
"college": college,
"sector": sector,
},
many_slugs={"commissions": commissions},
extra=CONSENT("accept_charter", "accept_privacy"),
)

# -- Annuaire : demande de référencement -> fiche "pending", jamais publiée
class OrganizationSubmitSerializer(CleanedModelSerializer):
    college = serializers.SlugRelatedField(slug_field="slug", queryset=active(College))
    sector = serializers.CharField(
    max_length=255,
    trim_whitespace=True
)
    commissions = serializers.SlugRelatedField(slug_field="slug", many=True, required=False, queryset=active(Commission))
    accept_charter = serializers.BooleanField(write_only=True)
    accept_privacy = serializers.BooleanField(write_only=True)

    class Meta:  # liste blanche : validation_status, is_published, member_founder ne sont jamais modifiables ici
        model = Organization
        extra_kwargs = {"description": {"max_length": 500}}
        fields = ["name", "logo", "college", "sector", "commissions", "pole", "neighborhood", "address",
                  "latitude", "longitude", "description", "website", "linkedin", "facebook", "instagram",
                  "representative_name", "representative_role", "phone", "email", "representative_phone",
                  "representative_email", "offers", "needs", "accept_charter", "accept_privacy"]

    
    def create(self, data):
        data.pop("accept_charter", None)
        data.pop("accept_privacy", None)

        comms = data.pop("commissions", [])

        # Keep text fields as text; don't access .slug on a string.
        org = Organization.objects.create(**data)
        org.commissions.set(comms)

        return org

class NewsletterView(SubmissionCreateView):
    """Idempotent : une adresse déjà inscrite reçoit la même réponse (pas d'énumération d'abonnés)."""
    success_message = "Merci, votre inscription à la newsletter est enregistrée."

    class serializer_class(serializers.Serializer):
        name = serializers.CharField(max_length=150, required=False, allow_blank=True)
        email = serializers.EmailField()
        organization = serializers.CharField(max_length=200, required=False, allow_blank=True)

        def create(self, data):
            email = data.pop("email").strip().lower()
            sub, created = NewsletterSubscriber.objects.get_or_create(email=email, defaults=data)
            sub.welcome = created  # e-mail de bienvenue seulement pour une nouvelle inscription ou une réinscription
            if not sub.is_active:
                sub.is_active = True
                sub.save(update_fields=["is_active", "updated_at"])
                sub.welcome = True
            return sub

    def after_create(self, sub):
        if getattr(sub, "welcome", False):
            super().after_create(sub)


_EventRequestBase = build_serializer(
    EventRequest, ["kind", "name", "organization", "job_title", "email", "phone", "options", "what_offers", "what_needs", "message",
                   "accept_privacy"],
    extra={**CONSENT("accept_privacy"),
           # Les anciens types (reboisement, visite, portes ouvertes) restent en base pour l'historique mais ne sont plus acceptés.
           "kind": serializers.ChoiceField(choices=[(k.value, k.label) for k in EventRequest.OPEN_KINDS]),
           "options": serializers.ListField(child=serializers.ChoiceField(choices=list(EventRequest.REGISTRATION_OPTIONS)),
                                            required=False)})


class EventRequestSerializer(_EventRequestBase):
    """Option distincte, facultative et non cochée : recevoir La Lettre du Hub (jamais une condition de l'inscription)."""
    newsletter = serializers.BooleanField(required=False, default=False, write_only=True)

    class Meta(_EventRequestBase.Meta):
        fields = _EventRequestBase.Meta.fields + ["newsletter"]

    def create(self, data):
        wants = data.pop("newsletter", False)
        obj = super().create(data)
        obj.wants_newsletter = wants
        return obj


def subscribe_newsletter(obj):
    """Inscription à la newsletter demandée dans un formulaire de l'événement (sans second e-mail)."""
    sub, created = NewsletterSubscriber.objects.get_or_create(
        email=obj.email.strip().lower(), defaults={"name": obj.name, "organization": getattr(obj, "organization", "")})
    if not created and not sub.is_active:
        sub.is_active = True
        sub.save(update_fields=["is_active", "updated_at"])


class EventRequestCreate(SubmissionCreateView):
    """Demandes liées aux événements. Une inscription au Grand Week-End est confirmée d'office et le badge part aussitôt
    par e-mail. Une même adresse peut inscrire plusieurs personnes ; la même personne (même nom, même adresse) n'a qu'un
    badge par édition."""
    success_message = "Merci. Votre demande a bien été transmise. La Coordination vous recontactera rapidement."
    serializer_class = EventRequestSerializer

    def existing(self, data):
        if data.get("kind") not in EventRequest.BADGE_KINDS:
            return None
        from apps.events import badges
        r = badges.same_person(data.get("name", ""), data.get("email", ""))
        if r is None:
            return None
        resent = badges.resend_if_stale(r)
        detail = ("Une inscription existe déjà à ce nom avec cette adresse e-mail : vous n'avez rien à refaire. "
                  + (f"Votre badge vient de vous être renvoyé à {r.email}." if resent else "Votre badge vous a été envoyé par e-mail."))
        return Response({"detail": detail, "duplicate": True}, status=200)

    def after_create(self, obj):
        if getattr(obj, "wants_newsletter", False):
            subscribe_newsletter(obj)
        if obj.kind not in EventRequest.BADGE_KINDS:
            super().after_create(obj)  # accusé de réception (After Work, Défis Partenaires)
            return
        from apps.events import badges
        sent = badges.issue(obj)
        if obj.status == "waitlist":  # jauge atteinte : ni badge ni QR code avant confirmation
            self.success_message = ("Votre demande est en liste d'attente. Votre accès n'est pas encore confirmé. "
                                    "Si une place vous est proposée, vous recevrez un message distinct.")
            return
        # Écran de confirmation : liens utiles pour la personne qui vient de s'inscrire (son propre dossier uniquement)
        self.extra_response = {"badge_url": badges.owner_url(obj), "visual_url": badges.visual_url(obj),
                               "business_connect_url": badges.business_connect_url(obj)}
        if sent:
            self.success_message = (f"Merci, votre inscription est confirmée (référence {badges.reference(obj)}). Votre badge vient d'être "
                                    f"envoyé à {obj.email} : présentez-le à l'accueil, sur votre téléphone ou imprimé. "
                                    "Pensez à vérifier vos courriers indésirables.")
        else:
            self.success_message = (f"Merci, votre inscription est enregistrée (référence {badges.reference(obj)}). Votre badge n'a pas pu "
                                    "être envoyé par e-mail pour le moment : la Coordination vous le fera parvenir.")


urlpatterns = [
    path("memberships/", submission_view(membership, name="MembershipCreate", after=open_dossier)),  
    path("organizations/submit/", submission_view(
        OrganizationSubmitSerializer, name="OrganizationSubmit", after=link_org_submission,
        message="Merci. Votre fiche a bien été transmise. La Coordination vous contactera sous 72 heures "
                "pour finaliser votre adhésion et publier votre fiche.")),
    path("partnerships/", submission_view(build_serializer(
        PartnershipApplication, ["company", "sector", "tier", "contact_name", "role", "phone", "email", "wants_discussion", "in_kind",
                                 "in_kind_description", "institutional", "message", "accept_privacy"],
        slugs={"tier": (active(PartnershipTier), False)}, extra=CONSENT("accept_privacy")), name="PartnershipCreate")),
    path("newsletter/", NewsletterView.as_view()),
    path("contact/", submission_view(build_serializer(
        ContactMessage, ["name", "organization", "phone", "email", "subject", "message", "consent"],
        extra=CONSENT("consent")), "Merci. Votre message a bien été envoyé.", "ContactCreate", notify_contact)),
    path("press/accreditation/", submission_view(build_serializer(
        PressAccreditation, ["request_type", "media", "name", "role", "phone", "email", "attendance_days", "coverage", "guests"]),
        name="AccreditationCreate")),
    path("stands/", submission_view(build_serializer(
        StandRequest, ["space", "structure", "commune", "products", "manager", "email", "phone", "needs", "team_size", "message",
                       "accept_privacy"], extra=CONSENT("accept_privacy")),
        "Merci. Votre demande de stand est reçue. Elle ne réserve pas encore de stand : la Coordination vous confirmera "
        "l'emplacement, les conditions et le montant. Aucun paiement n'est demandé à ce stade.", "StandRequestCreate")),
    path("map/suggest/", submission_view(build_serializer(
        PlaceSuggestion, ["name", "category", "address", "latitude", "longitude", "description", "website", "phone",
                          "email", "opening_hours", "photo", "submitter_name", "submitter_email"],
        slugs={"category": (active(MapCategory), True)}),
        "Merci. Votre proposition a bien été transmise : la Coordination vérifie chaque information avant publication.", "PlaceSuggest")),
    path("awards/applications/", submission_view(build_serializer(
        AwardApplication, ["category", "category_2", "applicant_name", "organization", "commune", "email", "phone", "description",
                           "evidence", "on_behalf", "submitter_name", "candidate_agrees", "supporting_document", "document_2",
                           "document_3", "accept_rules", "accept_privacy"],
        slugs={"category": (active(AwardCategory), True), "category_2": (active(AwardCategory), False)},
        extra=CONSENT("accept_rules", "accept_privacy")),
        "Merci. Votre candidature est reçue. Le dépôt ne vaut ni nomination ni badge d'accès.", "AwardApply")),
    path("business-connect/", submission_view(build_serializer(
        BusinessConnectRegistration, ["event", "participant_name", "organization", "job_title", "email", "phone", "what_offers",
                                      "what_needs", "objective", "slots", "days", "preferred_meetings", "accept_privacy"],
        slugs={"event": (Event.objects.public(), True)},
        extra={**CONSENT("accept_privacy"),
               # Disponibilités : uniquement parmi les créneaux publiés (approuvés par la Coordination)
               "slots": serializers.PrimaryKeyRelatedField(many=True, required=False,
                                                           queryset=BusinessConnectSlot.objects.filter(is_published=True)),
               "days": serializers.ListField(child=serializers.ChoiceField(choices=["vendredi", "samedi"]), required=False)}),
        "Merci. Votre demande Business Connect est reçue : ce n'est pas encore un rendez-vous. La Coordination associe les "
        "demandes et vous enverra uniquement les rendez-vous confirmés.", "BusinessConnect")),
    path("event-requests/", EventRequestCreate.as_view()),
    path("volunteers/", submission_view(build_serializer(
        VolunteerApplication, ["name", "email", "phone", "organization", "commune", "days", "missions", "availability", "message",
                               "accept_charter", "photo_consent"],
        many_slugs={"missions": (active(VolunteerMission), False)},
        extra={**CONSENT("accept_charter"),
               "days": serializers.ListField(child=serializers.ChoiceField(choices=["vendredi", "samedi"]), required=False)}),
        "Merci. Votre candidature de bénévole est reçue. Après sélection, la Coordination vous enverra votre mission, "
        "l'adresse du rendez-vous et votre badge.", "VolunteerApply")),
]
