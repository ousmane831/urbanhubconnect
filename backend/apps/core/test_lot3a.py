"""Cahier des charges du 20 novembre 2026, lot 3a : jauge et liste d'attente, échecs d'envoi, rôle Accueil, export des
présences, filtres d'impression, stand, Awards par catégorie, presse et délégations, partenariat, bénévolat."""
from datetime import date
from io import StringIO
from unittest import mock

from django.core import mail
from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase

from apps.core.models import SiteSettings
from apps.events import badges
from apps.events.models import AwardApplication, AwardCategory, EventRequest, StandRequest, VolunteerApplication
from apps.partnerships.models import PartnershipApplication
from apps.press.models import PressAccreditation
from apps.users.models import User

PW = "Mot-de-passe-123"


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        mail.outbox.clear()

    def register(self, email="a@x.org", name="Awa Ndiaye", **kw):
        return self.client.post("/api/event-requests/", {"kind": "registration", "name": name, "email": email,
                                                         "accept_privacy": True, **kw}, format="json")

    def login(self, role=User.Role.COORDINATION, username="boss"):
        User.objects.create_user(username, f"{username}@x.org", PW, role=role)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": username, "password": PW}, format="json")
        return c


class WaitlistTests(Base):
    def test_beyond_the_capacity_registrations_wait_without_a_badge(self):
        SiteSettings.objects.update_or_create(pk=1, defaults={"gwe_capacity": 1})
        self.register()
        self.assertEqual(self.client.get("/api/gwe/places/").json(), {"limited": True, "full": True})
        mail.outbox.clear()
        r = self.register(email="b@x.org", name="Moussa Fall").json()
        waiting = EventRequest.objects.get(email="b@x.org")
        self.assertEqual(waiting.status, "waitlist")
        self.assertIsNone(waiting.badge_token)  # aucun QR code avant confirmation
        self.assertIn("liste d'attente", r["detail"])
        self.assertNotIn("badge_url", r)
        self.assertEqual(mail.outbox[-1].subject, "Grand Week-End du Pôle : votre demande est en liste d'attente")
        self.assertFalse(mail.outbox[-1].attachments)

        c = self.login()
        items = c.get("/api/coordination/queue/event-requests/").json()["items"]
        self.assertEqual([i["title"] for i in items], ["Moussa Fall"])
        self.assertEqual(items[0]["actions"][0]["label"], "Confirmer et envoyer le badge")
        c.post(f"/api/coordination/queue/event-requests/{waiting.pk}/accept/", {}, format="json")
        waiting.refresh_from_db()
        self.assertEqual(waiting.status, "accepted")
        self.assertTrue(waiting.badge_token and waiting.badge_sent_at)

    def test_no_capacity_means_no_waitlist(self):
        self.assertEqual(self.client.get("/api/gwe/places/").json(), {"limited": False, "full": False})


class SendFailureTests(Base):
    def test_a_failed_send_is_recorded_and_listed(self):
        with mock.patch("django.core.mail.EmailMultiAlternatives.send", side_effect=OSError("adresse refusée")):
            self.register()
        reg = EventRequest.objects.get()
        self.assertIn("adresse refusée", reg.badge_error)
        c = self.login()
        unsent = c.get("/api/coordination/checkin/unsent/").json()
        self.assertEqual(unsent[0]["reference"], "GWE-0001")
        self.assertEqual(c.get("/api/coordination/checkin/stats/").json()["unsent"], 1)
        c.post("/api/coordination/checkin/resend/", {"id": reg.pk}, format="json")
        reg.refresh_from_db()
        self.assertEqual(reg.badge_error, "")


class ReceptionRoleTests(Base):
    def test_reception_agent_scans_but_sees_nothing_else(self):
        self.register(phone="770000000")
        reg = EventRequest.objects.get()
        agent = self.login(User.Role.ACCUEIL, "accueil")
        self.assertEqual(agent.get("/api/coordination/me/").json()["role"], "ACCUEIL")
        self.assertEqual(agent.post("/api/coordination/checkin/", {"code": badges.badge_url(reg)}, format="json").json()["result"], "ok")
        found = agent.get("/api/coordination/checkin/search/", {"q": "awa"}).json()[0]
        self.assertEqual((found["phone"], found["email"]), ("", "a…@x.org"))
        for url in ("/api/coordination/summary/", "/api/coordination/queue/event-requests/", "/api/coordination/badges/print/",
                    "/api/coordination/checkin/presences.csv"):
            self.assertIn(agent.get(url).status_code, (401, 403), url)
        self.assertIn(agent.post("/api/coordination/checkin/cancel/", {"id": reg.pk}, format="json").status_code, (401, 403))
        self.assertFalse(User.objects.get(username="accueil").is_staff)  # pas d'accès à l'administration


class ExportAndPrintTests(Base):
    def test_attendance_export_without_contact_details(self):
        self.register()
        reg = EventRequest.objects.get()
        badges.check_in(reg, today=date(2026, 12, 11))
        csv = self.login().get("/api/coordination/checkin/presences.csv").content.decode("utf-8-sig")
        self.assertIn("Présent le 11/12", csv)
        self.assertIn("GWE-0001;Awa Ndiaye", csv)
        self.assertNotIn("@", csv)

    def test_print_filter_by_category(self):
        self.register()
        self.register(email="b@x.org", name="Moussa Fall")
        EventRequest.objects.filter(email="b@x.org").update(badge_category="press")
        data = self.login().get("/api/coordination/badges/print/", {"categorie": "press"}).json()
        self.assertEqual([(b["name"], b["category"]) for b in data["badges"]], [("Moussa Fall", "Presse")])


class FormsTests(Base):
    def test_stand_request(self):
        r = self.client.post("/api/stands/", {"space": "terroir", "structure": "GIE Femmes de Bambilor", "commune": "Bambilor",
                                              "products": "Jus locaux", "manager": "Awa", "email": "s@x.org", "phone": "77",
                                              "team_size": 3, "accept_privacy": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        s = StandRequest.objects.get()
        self.assertEqual(r.json()["reference"], f"STD-{s.pk:05d}")
        self.assertIn("ne réserve pas encore de stand", mail.outbox[-1].body)
        items = self.login().get("/api/coordination/queue/stands/").json()["items"]
        self.assertEqual(items[0]["title"], "GIE Femmes de Bambilor")

    def test_awards_state_is_checked_per_category(self):
        young = AwardCategory.objects.get(slug="jeune-talent-du-pole")
        pme = AwardCategory.objects.get(slug="pme-de-lannee")
        self.assertEqual((young.closes_on, pme.closes_on), (date(2026, 11, 25), date(2026, 11, 20)))
        base = {"applicant_name": "Awa", "email": "aw@x.org", "description": "Mon parcours", "accept_rules": True, "accept_privacy": True}
        with mock.patch("django.utils.timezone.localdate", return_value=date(2026, 11, 22)):
            states = {c["slug"]: c["is_open"] for c in self.client.get("/api/awards/categories/").json()}
            self.assertEqual((states["jeune-talent-du-pole"], states["pme-de-lannee"]), (True, False))
            closed = self.client.post("/api/awards/applications/", {**base, "category": pme.slug}, format="json")
            self.assertEqual(closed.status_code, 400)
            self.assertIn("closes", str(closed.json()))
            ok = self.client.post("/api/awards/applications/", {**base, "category": young.slug}, format="json")
            self.assertEqual(ok.status_code, 201, ok.content)
        self.assertIn("ni nomination ni badge", ok.json()["detail"])

    def test_awards_by_a_third_party_needs_the_candidate_agreement(self):
        young = AwardCategory.objects.get(slug="jeune-talent-du-pole")
        data = {"category": young.slug, "applicant_name": "Awa", "email": "aw@x.org", "description": "Parcours", "on_behalf": True,
                "submitter_name": "Moussa", "accept_rules": True, "accept_privacy": True}
        with mock.patch("django.utils.timezone.localdate", return_value=date(2026, 11, 22)):
            self.assertIn("candidate_agrees", self.client.post("/api/awards/applications/", data, format="json").json())
            self.assertEqual(self.client.post("/api/awards/applications/", {**data, "candidate_agrees": True}, format="json").status_code, 201)
        self.assertTrue(AwardApplication.objects.get().on_behalf)

    def test_institutional_delegation_and_in_kind_partnership(self):
        r = self.client.post("/api/press/accreditation/", {"request_type": "institution", "media": "Ministère", "name": "Référent",
                                                           "phone": "77", "email": "d@x.org", "guests": "Invité 1\nInvité 2"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(PressAccreditation.objects.get().request_type, "institution")
        missing = self.client.post("/api/partnerships/", {"company": "X", "contact_name": "A", "phone": "77", "email": "p@x.org",
                                                          "in_kind": True, "accept_privacy": True}, format="json")
        self.assertIn("in_kind_description", missing.json())
        ok = self.client.post("/api/partnerships/", {"company": "X", "contact_name": "A", "phone": "77", "email": "p@x.org", "in_kind": True,
                                                     "in_kind_description": "Sonorisation", "accept_privacy": True}, format="json")
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(PartnershipApplication.objects.get().in_kind_description, "Sonorisation")

    def test_volunteer_charter_days_and_separate_photo_consent(self):
        data = {"name": "Awa", "email": "v@x.org", "phone": "77", "commune": "Diamniadio", "days": ["vendredi"]}
        self.assertIn("accept_charter", self.client.post("/api/volunteers/", data, format="json").json())
        self.assertEqual(self.client.post("/api/volunteers/", {**data, "accept_charter": True}, format="json").status_code, 201)
        v = VolunteerApplication.objects.get()
        self.assertEqual((v.days, v.photo_consent), (["vendredi"], False))
