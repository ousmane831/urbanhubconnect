from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import PublishableModel, Submission, Taxonomy
from apps.core.utils import unique_slugify
from apps.core.validators import validate_image_extension, validate_pdf, validate_upload_size


class EventCategory(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "type d'événement", "types d'événement"


class EventQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_published=True)


class Event(PublishableModel):
    title = models.CharField("titre", max_length=200)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    category = models.ForeignKey(EventCategory, on_delete=models.PROTECT, related_name="events", verbose_name="type")
    description = models.TextField(blank=True)
    audience = models.CharField("public", max_length=200, blank=True)
    start_date = models.DateTimeField("début")
    end_date = models.DateTimeField("fin", null=True, blank=True)
    location = models.CharField("lieu", max_length=255, blank=True)
    image = models.ImageField(upload_to="events/", blank=True, validators=[validate_image_extension, validate_upload_size])
    registration_url = models.URLField("lien d'inscription", blank=True)
    is_featured = models.BooleanField("à la une", default=False)
    registration_opens_at = models.DateTimeField("ouverture des inscriptions", null=True, blank=True,
                                                 help_text="Avant cette date, le bouton d'inscription est grisé.")

    objects = EventQuerySet.as_manager()

    class Meta:
        ordering = ["start_date"]
        verbose_name, verbose_name_plural = "événement", "événements"

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "La fin ne peut pas précéder le début."})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=100)
        super().save(*args, **kwargs)


class AwardCategory(Taxonomy):
    criteria = models.TextField("critères", blank=True, help_text="[à compléter]")
    # État vérifié pour chaque catégorie au dépôt : la Coordination modifie la date ; rien ne s'ouvre ni ne se ferme implicitement.
    closes_on = models.DateField("candidatures jusqu'au", null=True, blank=True,
                                 help_text="Dernier jour de dépôt (inclus). Vide : catégorie ouverte.")

    def is_open(self, today=None):
        from django.utils import timezone
        return self.is_active and (self.closes_on is None or (today or timezone.localdate()) <= self.closes_on)

    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "catégorie d'Awards", "catégories d'Awards"


class AwardApplication(Submission):
    category = models.ForeignKey(AwardCategory, on_delete=models.PROTECT, related_name="applications")
    category_2 = models.ForeignKey(AwardCategory, on_delete=models.PROTECT, related_name="second_applications", null=True, blank=True,
                                   verbose_name="seconde catégorie")
    applicant_name = models.CharField("candidat (organisation ou personne)", max_length=200)
    organization = models.CharField(max_length=200, blank=True)
    commune = models.CharField("commune ou zone d'activité", max_length=150, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    description = models.TextField("projet ou parcours")
    evidence = models.TextField("éléments probants", blank=True)
    on_behalf = models.BooleanField("présentée par un tiers", default=False)
    submitter_name = models.CharField("nom de la personne qui présente", max_length=150, blank=True)
    candidate_agrees = models.BooleanField("accord du candidat confirmé", default=False)
    supporting_document = models.FileField(upload_to="awards/", blank=True, validators=[validate_pdf, validate_upload_size])
    document_2 = models.FileField("pièce 2", upload_to="awards/", blank=True, validators=[validate_pdf, validate_upload_size])
    document_3 = models.FileField("pièce 3", upload_to="awards/", blank=True, validators=[validate_pdf, validate_upload_size])
    accept_rules = models.BooleanField("règlement accepté", default=False)
    accept_privacy = models.BooleanField(default=False)

    def clean(self):
        super().clean()
        errors = {}
        cats = [c for c in (getattr(self, "category", None), getattr(self, "category_2", None)) if c is not None]
        if self.pk is None:
            closed = [c.name for c in cats if not c.is_open()]
            if closed:
                errors["category"] = f"Les candidatures sont closes pour : {', '.join(closed)}."
        if len(cats) == 2 and cats[0].pk == cats[1].pk:
            errors["category_2"] = "Choisissez une seconde catégorie différente."
        if self.on_behalf and not self.candidate_agrees:
            errors["candidate_agrees"] = "Confirmez l'accord du candidat."
        if self.on_behalf and not self.submitter_name.strip():
            errors["submitter_name"] = "Indiquez votre nom."
        if errors:
            raise ValidationError(errors)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "candidature Awards", "candidatures Awards"

    def __str__(self):
        return f"{self.applicant_name} — {self.category}"


class BusinessConnectSlot(models.Model):
    """Créneau de rendez-vous Business Connect. Seuls les créneaux publiés (approuvés par la Coordination) sont proposés."""
    day = models.DateField("jour")
    start = models.TimeField("début")
    end = models.TimeField("fin")
    is_published = models.BooleanField("publié", default=False, help_text="À cocher seulement pour un créneau approuvé.")

    class Meta:
        ordering = ["day", "start"]
        verbose_name, verbose_name_plural = "créneau Business Connect", "créneaux Business Connect"

    def __str__(self):
        jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
        return f"{jours[self.day.weekday()].capitalize()} {self.day.day:02d}/{self.day.month:02d} · {self.start:%H:%M}–{self.end:%H:%M}"

    def clean(self):
        super().clean()
        if self.start and self.end and self.end <= self.start:
            raise ValidationError({"end": "La fin doit suivre le début."})


BC_TEXT_MAX = 300


class BusinessConnectRegistration(Submission):
    event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="business_connect_registrations")
    participant_name = models.CharField(max_length=150)
    organization = models.CharField(max_length=200, blank=True)
    job_title = models.CharField("fonction", max_length=150, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    what_offers = models.TextField("ce que je propose", blank=True)
    what_needs = models.TextField("ce que je recherche", blank=True)
    objective = models.TextField("objectif de la rencontre", blank=True)
    slots = models.ManyToManyField(BusinessConnectSlot, blank=True, related_name="available", verbose_name="disponibilités")
    days = models.JSONField("jours disponibles", default=list, blank=True)
    preferred_meetings = models.TextField("rencontres souhaitées", blank=True)
    accept_privacy = models.BooleanField(default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "inscription Business Connect", "inscriptions Business Connect"

    def __str__(self):
        return f"{self.participant_name} — {self.organization}" if self.organization else self.participant_name

    def clean(self):
        super().clean()
        errors = {f: f"{BC_TEXT_MAX} caractères au maximum." for f in ("what_offers", "what_needs")
                  if len(getattr(self, f) or "") > BC_TEXT_MAX}
        if errors:
            raise ValidationError(errors)


class BusinessConnectMeeting(models.Model):
    """Rendez-vous entre deux participants, sur un créneau. Une demande reçue n'est pas un rendez-vous : seul un rendez-vous
    confirmé est communiqué aux participants. Le système refuse les chevauchements (même personne ou même table)."""
    class Status(models.TextChoices):
        PROPOSED = "proposed", "Proposé (non communiqué)"
        CONFIRMED = "confirmed", "Confirmé"
        CANCELLED = "cancelled", "Libéré"

    first = models.ForeignKey(BusinessConnectRegistration, on_delete=models.CASCADE, related_name="meetings_as_first", verbose_name="participant 1")
    second = models.ForeignKey(BusinessConnectRegistration, on_delete=models.CASCADE, related_name="meetings_as_second", verbose_name="participant 2")
    slot = models.ForeignKey(BusinessConnectSlot, on_delete=models.PROTECT, related_name="meetings", verbose_name="créneau")
    table = models.CharField("table", max_length=20, blank=True)
    status = models.CharField("statut", max_length=10, choices=Status.choices, default=Status.PROPOSED, db_index=True)
    confirmed_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["slot__day", "slot__start", "table"]
        verbose_name, verbose_name_plural = "rendez-vous Business Connect", "rendez-vous Business Connect"

    def __str__(self):
        return f"{self.first.participant_name} × {self.second.participant_name} · {self.slot}"

    def conflicts(self):
        """Chevauchements avec d'autres rendez-vous actifs du même créneau : participant déjà pris ou table occupée."""
        same = BusinessConnectMeeting.objects.filter(slot=self.slot).exclude(status=self.Status.CANCELLED).exclude(pk=self.pk)
        people = {self.first_id, self.second_id}
        problems = []
        for m in same.select_related("first", "second"):
            busy = people & {m.first_id, m.second_id}
            for pid in busy:
                who = self.first if pid == self.first_id else self.second
                problems.append(f"{who.participant_name} a déjà un rendez-vous sur ce créneau.")
            if self.table and m.table and m.table.strip().lower() == self.table.strip().lower():
                problems.append(f"La table {self.table} est déjà occupée sur ce créneau.")
        return sorted(set(problems))


class VolunteerMission(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "mission de bénévolat", "missions de bénévolat"


class VolunteerApplication(Submission):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    organization = models.CharField(max_length=200, blank=True)
    commune = models.CharField(max_length=150, blank=True)
    days = models.JSONField("jours disponibles", default=list, blank=True)
    accept_charter = models.BooleanField("Charte des bénévoles acceptée", default=False)
    photo_consent = models.BooleanField("accepte la prise et la diffusion de photos", default=False)
    missions = models.ManyToManyField(VolunteerMission, blank=True, related_name="applications")
    availability = models.CharField("disponibilités", max_length=255, blank=True)
    message = models.TextField(blank=True)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "candidature bénévole", "candidatures bénévoles"

    def __str__(self):
        return self.name


class StandRequest(Submission):
    """Demande de stand (Village du Pôle) ou d'espace au Marché du terroir. Le dépôt ne réserve pas de stand et ne donne
    lieu à aucun paiement : la Coordination confirme emplacement, conditions, montant et badges d'équipe."""
    class Space(models.TextChoices):
        VILLAGE = "village", "Stand au Village du Pôle"
        TERROIR = "terroir", "Marché du terroir"

    space = models.CharField("espace", max_length=10, choices=Space.choices)
    structure = models.CharField("structure ou activité", max_length=200)
    commune = models.CharField(max_length=150)
    products = models.TextField("produits ou services présentés")
    manager = models.CharField("responsable", max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    needs = models.TextField("besoins d'installation", blank=True)
    team_size = models.PositiveSmallIntegerField("nombre de personnes sur le stand", default=1)
    message = models.TextField(blank=True)
    accept_privacy = models.BooleanField(default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "demande de stand", "demandes de stand"

    def __str__(self):
        return f"{self.structure} — {self.get_space_display()}"


class EventSection(models.Model):
    """Bloc de contenu d'une page événement (programme, Awards, Business Connect…), modifiable dans l'admin."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="sections")
    slug = models.SlugField(max_length=60, help_text="Identifiant technique : ne pas modifier pour les blocs existants.")
    title = models.CharField("titre", max_length=200)
    body = models.TextField("texte", blank=True,
                            help_text="Paragraphes séparés par une ligne vide. Une ligne « heure | texte » devient une ligne de tableau.")
    order = models.PositiveIntegerField("ordre", default=0)
    is_published = models.BooleanField("publié", default=True)

    class Meta:
        ordering = ["order", "id"]
        unique_together = [("event", "slug")]
        verbose_name, verbose_name_plural = "bloc de contenu", "blocs de contenu"

    def __str__(self):
        return f"{self.event} · {self.title}"


class EventRequest(Submission):
    """Demandes liées aux événements : inscription au Grand Week-End, accueillir un After Work, Défis Partenaires.
    Les anciens types (reboisement, visite, portes ouvertes) ne sont plus proposés : conservés pour l'historique
    (cahier des charges du 20 novembre 2026)."""
    class Kind(models.TextChoices):
        REGISTRATION = "registration", "Inscription au Grand Week-End du Pôle"
        HOST_AFTERWORK = "host_afterwork", "Accueillir un After Work Connect"
        CARAVAN = "caravan", "Reboisement du Lac Rose (ancien programme)"
        CHALLENGE = "challenge", "Défis Partenaires : proposer une solution"
        BOOK_VISIT = "book_visit", "Réserver une visite (ancien programme)"
        OPEN_DOORS = "open_doors", "Ouvrir ses portes (ancien programme)"

    OPEN_KINDS = (Kind.REGISTRATION, Kind.HOST_AFTERWORK, Kind.CHALLENGE)
    # Jours prévus, facultatifs : servent à dimensionner l'accueil, le badge reste valable pour les deux journées.
    REGISTRATION_OPTIONS = {
        "vendredi": "Vendredi 11 décembre",
        "samedi": "Samedi 12 décembre",
    }
    # Choix des anciennes versions du formulaire : affichés dans l'administration pour l'historique, plus proposés.
    LEGACY_OPTIONS = {
        "vendredi-matin": "Vendredi matin : ouverture officielle et Forum du Pôle, panel 1",
        "business-connect-vendredi": "Business Connect, vendredi",
        "business-connect-samedi": "Business Connect, samedi",
        "reboisement": "Vendredi après-midi : reboisement du Lac Rose (ancien programme)",
        "samedi-forum": "Samedi : Forum du Pôle",
        "samedi-awards": "Samedi : cérémonie des Awards du Pôle",
        "navette-vendredi": "Navette depuis Dakar, vendredi (ancien programme)",
        "navette-samedi": "Navette depuis Dakar, samedi (ancien programme)",
    }

    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    name = models.CharField(max_length=150)
    organization = models.CharField(max_length=200, blank=True)
    job_title = models.CharField("fonction", max_length=150, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    circuit = models.CharField(max_length=1, blank=True, choices=[("A", "Circuit A (ancien programme)"), ("B", "Circuit B (ancien programme)")])
    options = models.JSONField("choix d'inscription", default=list, blank=True)
    what_offers = models.TextField("ce que je propose", blank=True)
    what_needs = models.TextField("ce que je recherche", blank=True)
    message = models.TextField(blank=True)
    accept_waiver = models.BooleanField("décharge de responsabilité acceptée", default=False)
    accept_privacy = models.BooleanField(default=False)
    # Badge du Grand Week-End : code secret porté par le QR code (aucune donnée personnelle dedans).
    badge_token = models.CharField("code du badge", max_length=32, unique=True, null=True, blank=True, editable=False)
    badge_sent_at = models.DateTimeField("badge envoyé le", null=True, blank=True, editable=False)
    # Numéro d'ordre du badge (1, 2, 3… dans l'ordre des inscriptions) : sert à trier les badges imprimés.
    badge_number = models.PositiveIntegerField("n° de badge", unique=True, null=True, blank=True, editable=False)
    badge_printed_at = models.DateTimeField("badge imprimé le", null=True, blank=True, editable=False)
    # Dernier échec d'envoi du badge (adresse refusée, serveur indisponible…) : visible à l'accueil et dans l'administration.
    badge_error = models.CharField("échec d'envoi du badge", max_length=255, blank=True, editable=False)

    class BadgeCategory(models.TextChoices):
        PARTICIPANT = "participant", "Participant"
        PARTNER = "partner", "Partenaire"
        PRESS = "press", "Presse"
        INSTITUTION = "institution", "Institution"
        EXHIBITOR = "exhibitor", "Exposant"
        VOLUNTEER = "volunteer", "Bénévole"
        ORGANISATION = "organisation", "Organisation"

    # Catégorie imprimée en toutes lettres sur le badge ; modifiable par la Coordination dans l'administration.
    badge_category = models.CharField("catégorie du badge", max_length=15, choices=BadgeCategory.choices, default=BadgeCategory.PARTICIPANT)
    # Droit Gala : jamais déduit de la catégorie ; seulement après attribution validée ou preuve de réservation officielle
    gala_access = models.BooleanField("accès au Gala", default=False,
                                      help_text="À cocher seulement après attribution validée ou preuve de réservation de la billetterie officielle.")
    guest_quota = models.ForeignKey("GuestQuota", null=True, blank=True, on_delete=models.SET_NULL, related_name="guests",
                                    verbose_name="invité au titre de")
    reminder_sent_at = models.DateTimeField("rappel envoyé le", null=True, blank=True, editable=False)

    BADGE_KINDS = (Kind.REGISTRATION, Kind.CARAVAN)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "demande liée à un événement", "demandes liées aux événements"

    def __str__(self):
        return f"{self.name} — {self.get_kind_display()}"

    def options_display(self):
        return [self.REGISTRATION_OPTIONS.get(o) or self.LEGACY_OPTIONS.get(o, o) for o in self.options or []]

    def days_display(self):
        """Jours prévus (nouveau formulaire) ; vide pour les inscriptions faites avec l'ancien formulaire."""
        return [self.REGISTRATION_OPTIONS[o] for o in self.options or [] if o in self.REGISTRATION_OPTIONS]

    @property
    def wants_planting(self):
        """Ancien programme : conservé pour l'historique dans l'administration, n'ouvre plus aucun droit."""
        return self.kind == self.Kind.CARAVAN or "reboisement" in (self.options or [])

    def clean(self):
        super().clean()
        opts = self.options or []
        if self.kind == self.Kind.REGISTRATION and self.pk is None and (
                not isinstance(opts, list) or any(o not in self.REGISTRATION_OPTIONS for o in opts)):
            raise ValidationError({"options": "Choix inconnu."})


class GalaRequest(Submission):
    """Demande d'information sur le Gala : jamais un achat ni un encaissement local (billetterie commune avec The Ground)."""
    class Interest(models.TextChoices):
        SEAT = "seat", "Place individuelle"
        TABLE = "table", "Table nominative de 10"
        INVITATION = "invitation", "Invitation"

    name = models.CharField(max_length=150)
    organization = models.CharField(max_length=200, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    interest = models.CharField("demande", max_length=12, choices=Interest.choices)
    seats = models.PositiveSmallIntegerField("nombre de places", default=1)
    message = models.TextField(blank=True)
    accept_privacy = models.BooleanField(default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "demande d'information Gala", "demandes d'information Gala"

    def __str__(self):
        return f"{self.name} — {self.get_interest_display()}"


class GuestQuota(models.Model):
    """Quota d'invités attribué par la Coordination (table du Gala, partenaire d'après convention, délégation). Le contact
    désigne ses invités par un lien personnel, dans la limite du quota ; chaque invité reçoit un badge nominatif."""
    class Kind(models.TextChoices):
        GALA_TABLE = "gala_table", "Table nominative du Gala"
        PARTNER = "partner", "Partenaire (d'après la convention)"
        DELEGATION = "delegation", "Délégation institutionnelle"

    kind = models.CharField("type", max_length=12, choices=Kind.choices)
    holder_name = models.CharField("contact", max_length=150)
    holder_email = models.EmailField("e-mail du contact")
    organization = models.CharField(max_length=200, blank=True)
    quota = models.PositiveSmallIntegerField("nombre d'invités")
    gala_access = models.BooleanField("les invités ont accès au Gala", default=False,
                                      help_text="Seulement après attribution validée ou preuve de réservation officielle.")
    token = models.CharField(max_length=32, unique=True, editable=False)
    link_sent_at = models.DateTimeField("lien envoyé le", null=True, blank=True, editable=False)
    note = models.TextField("note interne", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name, verbose_name_plural = "quota d'invités", "quotas d'invités"

    def __str__(self):
        return f"{self.organization or self.holder_name} · {self.get_kind_display()} ({self.quota})"

    def save(self, *args, **kwargs):
        if not self.token:
            import secrets
            self.token = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)

    def active_guests(self):
        return self.guests.exclude(status__in=["rejected", "cancelled"])

    def remaining(self):
        return max(0, self.quota - self.active_guests().count())


class CheckIn(models.Model):
    """Arrivée enregistrée au scan du badge : une par jour et par point de contrôle (site, Gala)."""
    class Point(models.TextChoices):
        SITE = "site", "Entrée du site"
        GALA = "gala", "Gala"

    registration = models.ForeignKey(EventRequest, on_delete=models.CASCADE, related_name="checkins", verbose_name="inscription")
    point = models.CharField("point de contrôle", max_length=4, choices=Point.choices, default=Point.SITE)
    day = models.DateField("jour")
    at = models.DateTimeField("heure d'arrivée", auto_now_add=True)
    by = models.ForeignKey("users.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+", verbose_name="scanné par")

    class Meta:
        ordering = ["-at"]
        unique_together = [("registration", "day", "point")]
        verbose_name, verbose_name_plural = "arrivée", "arrivées"

    def __str__(self):
        return f"{self.registration.name} · {self.day:%d/%m/%Y}"
