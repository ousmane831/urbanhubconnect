"""Note de la Coordination du 5 novembre 2026 : Grand Week-End sur deux journées, formulaires, formules, bandeau."""
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
RETIRED = ["13 décembre", "Caravane verte", "randonnée", "Challenge inter", "Portes Ouvertes", "circuit A", "Golden Chic",
           "Gala des Awards", "co-organis", "Rencontre des décideurs", "Vitrine des projets", "Agora Jeunesse", "31 octobre",
           "trois jours", "Trois jours", "11 au 13"]
migration = import_module("apps.events.migrations.0004_grand_week_end_update_nov_2026")


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
        self.assertTrue({"programme-vendredi", "programme-samedi", "reboisement", "gala", "experiences"} <= slugs)
        self.assertFalse(slugs & {"programme-dimanche", "portes-ouvertes", "caravane-verte"})

    def test_no_retired_wording_in_event_texts(self):
        texts = [s.title + s.body for s in EventSection.objects.all()] + [a.title + a.content for a in Article.objects.all()]
        for word in RETIRED:
            self.assertFalse([t for t in texts if word in t], word)

    def test_tiers_2026(self):
        amounts = dict(PartnershipTier.objects.values_list("slug", "amount_fcfa"))
        self.assertEqual(amounts["partenaire-fondateur"], 5_000_000)
        self.assertEqual(amounts["pack-pme-du-pole"], 250_000)

    def test_five_volunteer_missions(self):
        self.assertEqual(VolunteerMission.objects.filter(is_active=True).count(), 5)


class MigrationTests(Base):
    """Base créée avec l'ancien programme à trois jours : la migration remplace les textes."""

    def test_updates_old_content(self):
        e = Event.objects.get(slug=SLUG)
        e.end_date = datetime(2026, 12, 13, 23, 59, tzinfo=DAKAR)
        e.save()
        e.sections.filter(slug="programme-vendredi").update(body="9 h 00 – 12 h 30 | Rencontre des décideurs")
        EventSection.objects.create(event=e, slug="caravane-verte", title="Caravane verte", body="Dimanche 13 décembre")
        e.sections.filter(slug="awards").update(body="Texte modifié dans l'admin")
        PartnershipTier.objects.filter(slug="partenaire-fondateur").update(amount_fcfa=7_500_000)
        VolunteerMission.objects.all().delete()
        for n in ["Orientation", "Portes Ouvertes", "Caravane verte et reboisement"]:
            VolunteerMission.objects.create(name=n)
        Article.objects.update(content="lancé du vendredi 11 au dimanche 13 décembre 2026 : bla")

        migration.forwards(django_apps, None)

        e.refresh_from_db()
        self.assertEqual(e.end_date.astimezone(DAKAR).day, 12)
        self.assertIn("Café des décideurs", e.sections.get(slug="programme-vendredi").body)
        self.assertFalse(e.sections.filter(slug="caravane-verte").exists())
        self.assertEqual(e.sections.get(slug="awards").body, "Texte modifié dans l'admin")
        self.assertEqual(PartnershipTier.objects.get(slug="partenaire-fondateur").amount_fcfa, 5_000_000)
        active = set(VolunteerMission.objects.filter(is_active=True).values_list("name", flat=True))
        self.assertIn("Convoi et reboisement du Lac Rose", active)
        self.assertNotIn("Portes Ouvertes", active)
        self.assertIn("les vendredi 11 et samedi 12 décembre 2026", Article.objects.first().content)


class RegistrationFormTests(Base):
    def test_registration_with_options(self):
        r = self.post({"kind": "registration", "options": ["vendredi-matin", "business-connect-samedi"], "what_offers": "Conseil"})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(EventRequest.objects.get().options, ["vendredi-matin", "business-connect-samedi"])

    def test_registration_requires_an_option(self):
        self.assertEqual(self.post({"kind": "registration", "options": []}).status_code, 400)

    def test_unknown_option_rejected(self):
        self.assertEqual(self.post({"kind": "registration", "options": ["caravane"]}).status_code, 400)

    def test_planting_requires_waiver(self):
        self.assertIn("accept_waiver", self.post({"kind": "registration", "options": ["reboisement"]}).json())
        self.assertEqual(self.post({"kind": "registration", "options": ["reboisement"], "accept_waiver": True}).status_code, 201)
        self.assertIn("accept_waiver", self.post({"kind": "caravan"}).json())

    def test_retired_kinds_rejected(self):
        for kind in ("book_visit", "open_doors"):
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
