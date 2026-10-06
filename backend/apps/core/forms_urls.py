from django.urls import path
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.contact.models import ContactMessage
from apps.events.models import (AwardApplication, AwardCategory, BusinessConnectRegistration, Event, EventRequest,
                                VolunteerApplication, VolunteerMission)
from apps.map.models import MapCategory, PlaceSuggestion
from apps.memberships.models import MembershipApplication, MembershipCategory
from apps.newsletter.models import NewsletterSubscriber
from apps.organizations.models import College, Commission, Organization, Sector
from apps.partnerships.models import PartnershipApplication, PartnershipTier
from apps.press.models import PressAccreditation
from .forms_api import (CleanedModelSerializer, SubmissionCreateView, build_serializer, notify_contact,
                        submission_view)

active = lambda m: m.objects.filter(is_active=True)
college, sector = (active(College), False), (active(Sector), False)
commissions = (active(Commission), False)
CONSENT = lambda *n: {k: serializers.BooleanField(write_only=True) for k in n}

# -- Membership
membership = build_serializer(
    MembershipApplication,
    ["organization_or_name", "category", "college", "sector", "pole", "representative", "role", "phone",
     "email", "commissions", "offers", "needs", "accept_charter", "accept_privacy"],
    slugs={"category": (active(MembershipCategory), True), "college": college, "sector": sector},
    many_slugs={"commissions": commissions},
    extra=CONSENT("accept_charter", "accept_privacy"))

# -- Annuaire : demande de référencement -> fiche "pending", jamais publiée
class OrganizationSubmitSerializer(CleanedModelSerializer):
    college = serializers.SlugRelatedField(slug_field="slug", queryset=active(College))
    sector = serializers.SlugRelatedField(slug_field="slug", queryset=active(Sector))
    commissions = serializers.SlugRelatedField(slug_field="slug", many=True, required=False, queryset=active(Commission))
    accept_charter = serializers.BooleanField(write_only=True)
    accept_privacy = serializers.BooleanField(write_only=True)

    class Meta:  # liste blanche : validation_status, is_published, member_founder ne sont jamais modifiables ici
        model = Organization
        fields = ["name", "logo", "college", "sector", "commissions", "pole", "neighborhood", "address",
                  "latitude", "longitude", "description", "website", "linkedin", "facebook", "instagram",
                  "representative_name", "representative_role", "phone", "email", "representative_phone",
                  "representative_email", "offers", "needs", "accept_charter", "accept_privacy"]

    def create(self, data):
        data.pop("accept_charter"), data.pop("accept_privacy")
        comms = data.pop("commissions", [])
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
            sub, _ = NewsletterSubscriber.objects.get_or_create(email=email, defaults=data)
            if not sub.is_active:
                sub.is_active = True
                sub.save(update_fields=["is_active", "updated_at"])
            return sub


urlpatterns = [
    path("memberships/", submission_view(membership, name="MembershipCreate")),
    path("organizations/submit/", submission_view(
        OrganizationSubmitSerializer, name="OrganizationSubmit",
        message="Merci. Votre fiche a bien été transmise. La Coordination vous contactera sous 72 heures "
                "pour finaliser votre adhésion et publier votre fiche.")),
    path("partnerships/", submission_view(build_serializer(
        PartnershipApplication, ["company", "tier", "contact_name", "role", "phone", "email", "message", "accept_privacy"],
        slugs={"tier": (active(PartnershipTier), False)}, extra=CONSENT("accept_privacy")), name="PartnershipCreate")),
    path("newsletter/", NewsletterView.as_view()),
    path("contact/", submission_view(build_serializer(
        ContactMessage, ["name", "organization", "phone", "email", "subject", "message", "consent"],
        extra=CONSENT("consent")), "Merci. Votre message a bien été envoyé.", "ContactCreate", notify_contact)),
    path("press/accreditation/", submission_view(build_serializer(
        PressAccreditation, ["media", "name", "role", "phone", "email", "attendance_days"]), name="AccreditationCreate")),
    path("map/suggest/", submission_view(build_serializer(
        PlaceSuggestion, ["name", "category", "address", "latitude", "longitude", "description", "website", "phone",
                          "email", "opening_hours", "photo", "submitter_name", "submitter_email"],
        slugs={"category": (active(MapCategory), True)}),
        "Merci. Votre proposition a bien été transmise : la Coordination vérifie chaque information avant publication.", "PlaceSuggest")),
    path("awards/applications/", submission_view(build_serializer(
        AwardApplication, ["category", "applicant_name", "organization", "email", "phone", "description",
                           "supporting_document", "accept_privacy"],
        slugs={"category": (active(AwardCategory), True)}, extra=CONSENT("accept_privacy")), name="AwardApply")),
    path("business-connect/", submission_view(build_serializer(
        BusinessConnectRegistration, ["event", "participant_name", "organization", "email", "phone", "what_offers",
                                      "what_needs", "preferred_meetings", "accept_privacy"],
        slugs={"event": (Event.objects.public(), True)}, extra=CONSENT("accept_privacy")), name="BusinessConnect")),
    path("event-requests/", submission_view(build_serializer(
        EventRequest, ["kind", "name", "organization", "email", "phone", "circuit", "message", "accept_waiver", "accept_privacy"],
        extra=CONSENT("accept_privacy")), "Merci. Votre demande a bien été transmise. La Coordination vous recontactera rapidement.", "EventRequestCreate")),
    path("volunteers/", submission_view(build_serializer(
        VolunteerApplication, ["name", "email", "phone", "organization", "missions", "availability", "message"],
        many_slugs={"missions": (active(VolunteerMission), False)}), name="VolunteerApply")),
]
