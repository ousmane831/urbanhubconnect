"""Chaque formulaire du site envoie un accusé de réception au demandeur (une seule fois, à la bonne adresse)."""
from io import StringIO

from django.core import mail
from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.events.models import AwardCategory, VolunteerMission
from apps.map.models import MapCategory
from apps.memberships.models import MembershipCategory
from apps.partnerships.models import PartnershipTier


class ConfirmationTests(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        mail.outbox.clear()

    def post(self, url, data):
        r = self.client.post(url, data, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r

    def to(self, address):
        return [m for m in mail.outbox if m.to == [address]]

    def test_contact_confirms_to_the_sender_and_notifies_the_coordination(self):
        self.post("/api/contact/", {"name": "Awa", "email": "awa@x.org", "subject": "press", "message": "Bonjour", "consent": True})
        mine = self.to("awa@x.org")
        self.assertEqual(len(mine), 1)
        self.assertIn("bien reçu votre message", mine[0].body)
        self.assertIn("Bonjour", mine[0].body)
        self.assertEqual(len(mail.outbox), 2)  # + la copie à la Coordination

    def test_partnership(self):
        self.post("/api/partnerships/", {"company": "Exemple SA", "tier": PartnershipTier.objects.first().slug, "contact_name": "Awa",
                                         "phone": "77", "email": "p@x.org", "accept_privacy": True})
        self.assertIn("72 heures", self.to("p@x.org")[0].body)

    def test_press_accreditation(self):
        self.post("/api/press/accreditation/", {"media": "RFM", "name": "Awa", "phone": "77", "email": "j@x.org", "attendance_days": "vendredi"})
        self.assertIn("accréditation", self.to("j@x.org")[0].subject)

    def test_awards_application(self):
        self.post("/api/awards/applications/", {"category": AwardCategory.objects.first().slug, "applicant_name": "Awa", "email": "aw@x.org",
                                                "description": "Notre projet", "accept_privacy": True})
        self.assertIn("1er décembre", self.to("aw@x.org")[0].body)

    def test_business_connect(self):
        self.post("/api/business-connect/", {"event": "grand-week-end-du-pole-2026", "participant_name": "Awa", "email": "bc@x.org",
                                             "what_offers": "Conseil", "accept_privacy": True})
        body = self.to("bc@x.org")[0].body
        self.assertIn("5 décembre", body)
        self.assertIn("Conseil", body)

    def test_volunteer(self):
        mission = VolunteerMission.objects.filter(is_active=True).first()
        self.post("/api/volunteers/", {"name": "Awa", "email": "v@x.org", "phone": "77", "missions": [mission.slug]})
        body = self.to("v@x.org")[0].body
        self.assertIn(mission.name, body)
        self.assertIn("5 décembre", body)

    def test_after_work_and_partner_challenge(self):
        self.post("/api/event-requests/", {"kind": "host_afterwork", "name": "Awa", "email": "h@x.org", "accept_privacy": True})
        self.post("/api/event-requests/", {"kind": "challenge", "name": "Awa", "email": "c@x.org", "message": "Ma solution", "accept_privacy": True})
        self.assertIn("After Work", self.to("h@x.org")[0].subject)
        self.assertIn("Défis", self.to("c@x.org")[0].subject)

    def test_place_suggestion(self):
        self.post("/api/map/suggest/", {"name": "Lieu", "category": MapCategory.objects.first().slug, "latitude": "14.72", "longitude": "-17.18",
                                        "submitter_name": "S", "submitter_email": "s@x.org"})
        self.assertIn("Cartographie", self.to("s@x.org")[0].subject)

    def test_newsletter_welcome_only_once(self):
        self.post("/api/newsletter/", {"email": "n@x.org"})
        self.post("/api/newsletter/", {"email": "n@x.org"})
        self.assertEqual(len(self.to("n@x.org")), 1)

    def test_membership_and_registration_keep_a_single_email(self):
        self.post("/api/memberships/", {"organization_or_name": "Exemple SA", "category": MembershipCategory.objects.first().slug,
                                        "representative": "Awa", "phone": "77", "email": "m@x.org", "accept_charter": True, "accept_privacy": True})
        self.assertEqual(len(self.to("m@x.org")), 1)
        self.post("/api/event-requests/", {"kind": "registration", "name": "Awa", "email": "r@x.org", "options": ["samedi-forum"], "accept_privacy": True})
        self.assertEqual(len(self.to("r@x.org")), 1)  # le badge sert de confirmation

    def test_a_failing_mail_server_never_blocks_the_form(self):
        from unittest import mock
        with mock.patch("apps.core.confirmations.send_mail", side_effect=OSError("SMTP indisponible")):
            self.post("/api/partnerships/", {"company": "X", "contact_name": "Awa", "phone": "77", "email": "p@x.org", "accept_privacy": True})


class ProfessionalAddressTests(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        mail.outbox.clear()

    def test_signature_uses_the_site_settings_and_replies_reach_the_coordination(self):
        from django.conf import settings
        from apps.core.models import SiteSettings
        SiteSettings.objects.update_or_create(pk=1, defaults={"email": "infos@urbanhubconnect.com"})
        self.client.post("/api/press/accreditation/", {"media": "RFM", "name": "Awa", "phone": "77", "email": "j@x.org"}, format="json")
        msg = [m for m in mail.outbox if m.to == ["j@x.org"]][0]
        self.assertIn("infos@urbanhubconnect.com", msg.body)
        self.assertNotIn("gmail", msg.body)
        self.assertEqual(msg.from_email, settings.DEFAULT_FROM_EMAIL)

    def test_migration_replaces_the_old_address_only(self):
        from importlib import import_module
        from django.apps import apps as django_apps
        from apps.core.models import SiteSettings
        from apps.news.models import Article
        old = "infosurbanhubconnect@gmail.com"
        SiteSettings.objects.update_or_create(pk=1, defaults={"email": old})
        art = Article.objects.first()
        Article.objects.filter(pk=art.pk).update(content=f"Écrivez à {old}.")
        import_module("apps.core.migrations.0006_sitesettings_email_pro").forwards(django_apps, None)
        self.assertEqual(SiteSettings.load().email, "infos@urbanhubconnect.com")
        art.refresh_from_db()
        self.assertEqual(art.content, "Écrivez à infos@urbanhubconnect.com.")
        SiteSettings.objects.filter(pk=1).update(email="autre@urbanhubconnect.com")  # choix fait dans l'admin : conservé
        import_module("apps.core.migrations.0006_sitesettings_email_pro").forwards(django_apps, None)
        self.assertEqual(SiteSettings.load().email, "autre@urbanhubconnect.com")
