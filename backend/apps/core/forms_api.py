from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMessage
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

CONSENT_FIELDS = ("accept_charter", "accept_privacy", "consent")
HONEYPOT = "company_website"  # champ invisible : rempli uniquement par les robots


class CleanedModelSerializer(serializers.ModelSerializer):
    """Applique aussi Model.clean() (que DRF ignore) et rend les consentements obligatoires."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {f: "Ce consentement est obligatoire." for f in CONSENT_FIELDS if f in self.fields and not attrs.get(f)}
        if errors:
            raise serializers.ValidationError(errors)
        model = self.Meta.model
        concrete = {f.name for f in model._meta.concrete_fields}
        try:
            model(**{k: v for k, v in attrs.items() if k in concrete}).clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.message_dict if hasattr(e, "error_dict") else e.messages)
        return attrs


def build_serializer(model, fields, slugs=None, many_slugs=None, extra=None):
    """slugs: {champ: (queryset, required)} ; many_slugs idem ; les relations sont désignées par leur slug."""
    attrs = {n: serializers.SlugRelatedField(slug_field="slug", queryset=qs, required=req, allow_null=not req)
             for n, (qs, req) in (slugs or {}).items()}
    attrs.update({n: serializers.SlugRelatedField(slug_field="slug", queryset=qs, many=True, required=req)
                  for n, (qs, req) in (many_slugs or {}).items()})
    attrs.update(extra or {})
    meta = type("Meta", (), {"model": model, "fields": fields})
    return type(f"{model.__name__}FormSerializer", (CleanedModelSerializer,), {**attrs, "Meta": meta})


class SubmissionCreateView(generics.CreateAPIView):
    """POST public : anti-spam (honeypot + throttling), validation backend, aucune lecture possible."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "form"
    success_message = "Merci. Votre demande a bien été transmise. La Coordination vous contactera sous 72 heures."

    def create(self, request, *args, **kwargs):
        if request.data.get(HONEYPOT):  # robot : faux succès, rien d'enregistré
            return Response({"detail": self.success_message}, status=status.HTTP_201_CREATED)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.after_create(serializer.save())
        return Response({"detail": self.success_message}, status=status.HTTP_201_CREATED)

    def after_create(self, obj):
        pass


def submission_view(serializer, message=None, name="SubmissionView", after=None):
    attrs = {"serializer_class": serializer}
    if message:
        attrs["success_message"] = message
    if after:
        attrs["after_create"] = lambda self, obj: after(obj)
    return type(name, (SubmissionCreateView,), attrs).as_view()


def notify_contact(msg):
    mail = EmailMessage(subject=f"[Site] {msg.get_subject_display()} — {msg.name}",
                        body=f"De : {msg.name} <{msg.email}> {msg.phone}\nOrganisation : {msg.organization}\n\n{msg.message}",
                        from_email=settings.DEFAULT_FROM_EMAIL, to=[settings.CONTACT_RECIPIENT], reply_to=[msg.email])
    try:
        mail.send(fail_silently=False)
        msg.email_sent = True
        msg.save(update_fields=["email_sent", "updated_at"])
    except Exception:  # le message reste en base et visible dans l'admin
        pass
