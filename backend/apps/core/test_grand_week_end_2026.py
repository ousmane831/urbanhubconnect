"""Grand Week-End sur deux journées (note du 5 novembre 2026), mis à jour par le cahier des charges du 20 novembre 2026 :
un seul lieu, pas d'horaires détaillés, plus de reboisement, de convoi ni de navette."""
from datetime import datetime, timedelta
from importlib import import_module
from io import StringIO
from unittest import mock
from zoneinfo import ZoneInfo

from django.apps import apps as django_apps
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.events.models import Event, EventRequest, EventSection, VolunteerMission
from apps.news.models import Article
from apps.partnerships.models import Partner, PartnershipTier

DAKAR = ZoneInfo("Africa/Dakar")
SLUG = "grand-week-end-du-pole-2026"
RETIRED = ["13 décembre", "Caravane verte", "randonnée", "Challenge inter", "Portes Ouvertes", "portes ouvertes", "circuit A",
           "Gala des Awards", "co-organis", "Rencontre des décideurs", "Vitrine des projets", "Agora Jeunesse", "31 octobre",
           "trois jours", "Trois jours", "11 au 13", "reboisement", "convoi", "navette", "causerie", "arbres", " h 30", " h 45",
           "à partir de 19 h"]
migration = import_module("apps.events.migrations.0007_cahier_des_charges_20_novembre_2026")


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())

    def post(self, data):
        base = {"name": "A. Exemple", "email": "a@exemple.org", "accept_privacy": True}
        return self.client.post("/api/event-requests/", {**base, **data}, format="json")


class SeedTests(Base):
    def test_two_days_and_countdown_target(self):
        e = Event.objects.get(slug=SLUG)
        self.assertEqual(e.start_date, datetime(2026, 12, 11, 9, 30, tzinfo=DAKAR))
        self.assertEqual(e.end_date.astimezone(DAKAR).date().isoformat(), "2026-12-12")
        slugs = set(e.sections.values_list("slug", flat=True))
        self.assertTrue({"programme-vendredi", "programme-samedi", "gala", "experiences"} <= slugs)
        self.assertFalse(slugs & {"programme-dimanche", "portes-ouvertes", "caravane-verte", "reboisement"})
        self.assertEqual(e.location, "The Ground, Diamniadio")
        self.assertIn("Gala du Pôle avec Youssou Ndour. Golden Chic, en partenariat avec The Ground.",
                      e.sections.get(slug="programme-samedi").body)

    def test_no_retired_wording_in_event_texts(self):
        texts = ([s.title + s.body for s in EventSection.objects.filter(is_published=True)] + [a.title + a.content for a in Article.objects.all()]
                 + [t.benefits for t in PartnershipTier.objects.all()])
        for word in RETIRED:
            self.assertFalse([t for t in texts if word in t], word)

    def test_tiers_2026(self):
        amounts = dict(PartnershipTier.objects.values_list("slug", "amount_fcfa"))
        self.assertEqual(amounts["partenaire-fondateur"], 5_000_000)
        self.assertEqual(amounts["pack-pme-du-pole"], 250_000)

    def test_four_volunteer_missions(self):
        self.assertEqual(VolunteerMission.objects.filter(is_active=True).count(), 4)


class MigrationTests(Base):
    """Base créée avant le cahier des charges du 20 novembre : la migration retire l'ancien programme."""

    def test_updates_old_content(self):
        e = Event.objects.get(slug=SLUG)
        e.location = "Diamniadio · Lac Rose"
        e.save()
        e.sections.filter(slug="programme-vendredi").update(body="14 h 30 | Départ en convoi pour le Lac Rose")
        EventSection.objects.create(event=e, slug="reboisement", title="Le grand reboisement", body="1 000 arbres")
        e.sections.filter(slug="awards").update(body="Texte modifié dans l'admin")
        PartnershipTier.objects.filter(slug="partenaire-associe").update(benefits="stand, 50 arbres")
        VolunteerMission.objects.create(name="Convoi et reboisement du Lac Rose", slug="convoi", is_active=True)
        Article.objects.update(content="rendez-vous d'affaires, grand reboisement du Lac Rose, Awards et Gala du Pôle.")
        reg = EventRequest.objects.create(kind="registration", name="Awa", email="a@x.org", options=["reboisement"], status="accepted")

        migration.forwards(django_apps, None)

        e.refresh_from_db()
        self.assertEqual(e.location, "The Ground, Diamniadio")
        self.assertNotIn("convoi", e.sections.get(slug="programme-vendredi").body)
        self.assertFalse(e.sections.get(slug="reboisement").is_published)
        self.assertEqual(e.sections.get(slug="awards").body, "Texte modifié dans l'admin")
        self.assertNotIn("arbres", PartnershipTier.objects.get(slug="partenaire-associe").benefits)
        self.assertFalse(VolunteerMission.objects.get(slug="convoi").is_active)
        self.assertNotIn("reboisement", Article.objects.first().content)
        reg.refresh_from_db()
        self.assertEqual(reg.options, ["reboisement"])  # l'historique du dossier est conservé


class RegistrationFormTests(Base):
    def test_registration_with_days(self):
        r = self.post({"kind": "registration", "options": ["vendredi", "samedi"], "job_title": "Directrice"})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(EventRequest.objects.get().options, ["vendredi", "samedi"])

    def test_days_are_optional(self):
        self.assertEqual(self.post({"kind": "registration", "options": []}).status_code, 201)

    def test_unknown_or_retired_option_rejected(self):
        for option in ("caravane", "reboisement", "navette-vendredi", "vendredi-matin"):
            self.assertEqual(self.post({"kind": "registration", "options": [option]}).status_code, 400, option)

    def test_retired_kinds_rejected(self):
        for kind in ("book_visit", "open_doors", "caravan"):
            self.assertEqual(self.post({"kind": kind, "circuit": "A"}).status_code, 400, kind)


class PublicApiTests(Base):
    def test_featured_event_stays_upcoming_until_saturday_midnight(self):
        during = datetime(2026, 12, 12, 20, 0, tzinfo=DAKAR)
        after = datetime(2026, 12, 13, 0, 1, tzinfo=DAKAR)
        with mock.patch("django.utils.timezone.now", return_value=during):
            self.assertEqual(self.client.get("/api/events/", {"is_featured": True, "upcoming": True}).json()["count"], 1)
            self.assertEqual(self.client.get("/api/events/", {"upcoming": False}).json()["count"], 0)
        with mock.patch("django.utils.timezone.now", return_value=after):
            self.assertEqual(self.client.get("/api/events/", {"is_featured": True, "upcoming": True}).json()["count"], 0)

    def test_partner_band_ordered(self):
        Partner.objects.create(name="The Ground", logo="t.png", band_order=2)
        Partner.objects.create(name="DGPU", logo="d.png", band_order=1)
        Partner.objects.create(name="M'ma Conciergerie", logo="m.png", band_order=3, dark_tile=True)
        Partner.objects.create(name="Hors bandeau", logo="h.png", is_confirmed=True)
        band = self.client.get("/api/partnerships/band/").json()
        self.assertEqual([p["name"] for p in band], ["DGPU", "The Ground", "M'ma Conciergerie"])
        self.assertTrue(band[2]["dark_tile"])
