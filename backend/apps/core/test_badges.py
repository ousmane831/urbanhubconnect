"""Badges du Grand Week-End : QR code envoyé à l'inscription, scan à l'accueil, places du convoi du reboisement."""
from datetime import date
from io import StringIO

from django.core import mail
from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase

from apps.core.models import SiteSettings
from apps.events import badges
from apps.events.models import CheckIn, EventRequest
from apps.users.models import User

PW = "Mot-de-passe-123"


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())

    def register(self, email="a@x.org", options=("vendredi-matin",), **kw):
        data = {"kind": "registration", "name": "Awa Ndiaye", "organization": "Exemple SA", "email": email, "phone": "770000000",
                "options": list(options), "accept_privacy": True, **kw}
        if "reboisement" in options:
            data["accept_waiver"] = True
        return self.client.post("/api/event-requests/", data, format="json")

    def staff(self):
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        return c


class RegistrationTests(Base):
    def test_registration_sends_a_badge_with_a_qr_code(self):
        r = self.register()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIn("badge", r.json()["detail"])
        reg = EventRequest.objects.get()
        self.assertEqual(reg.status, "accepted")  # confirmée d'office, rien à valider à la main
        self.assertTrue(reg.badge_token and reg.badge_sent_at)
        msg = mail.outbox[-1]
        self.assertEqual(msg.to, ["a@x.org"])
        self.assertIn("badge", msg.subject.lower())
        self.assertIn(f"/badge/{reg.badge_token}", msg.body)
        self.assertTrue(any(a.get_content_type() == "image/png" for a in msg.attachments))
        self.assertIn('cid:badge', msg.alternatives[0][0])

    def test_badge_page_and_qr_image_are_public_but_need_the_secret_code(self):
        self.register()
        reg = EventRequest.objects.get()
        data = self.client.get(f"/api/badges/{reg.badge_token}/").json()
        self.assertEqual((data["name"], data["valid"]), ("Awa Ndiaye", True))
        self.assertNotIn("email", data)
        self.assertNotIn("phone", data)
        png = self.client.get(f"/api/badges/{reg.badge_token}/qr.png")
        self.assertEqual(png["Content-Type"], "image/png")
        self.assertTrue(png.content.startswith(b"\x89PNG"))
        self.assertEqual(self.client.get("/api/badges/inventeAAAAAAAAAAAAAA/").status_code, 404)

    def test_other_requests_get_no_badge(self):
        self.client.post("/api/event-requests/", {"kind": "challenge", "name": "X", "email": "x@x.org", "message": "Ma solution",
                                                   "accept_privacy": True}, format="json")
        reg = EventRequest.objects.get()
        self.assertIsNone(reg.badge_token)
        self.assertEqual(reg.status, "pending")


class PlantingSeatsTests(Base):
    def test_convoy_seats_are_limited(self):
        SiteSettings.objects.update_or_create(pk=1, defaults={"planting_seats": 1})
        self.assertEqual(self.register(options=["reboisement"]).status_code, 201)
        self.assertEqual(self.client.get("/api/events-planting-seats/").json(), {"seats": 1, "remaining": 0})
        full = self.register(email="b@x.org", options=["reboisement"])
        self.assertEqual(full.status_code, 400)
        self.assertIn("complet", full.json()["options"][0])
        self.assertEqual(self.register(email="b@x.org", options=["samedi-forum"]).status_code, 201)  # les autres temps restent ouverts
        caravan = self.client.post("/api/event-requests/", {"kind": "caravan", "name": "C", "email": "c@x.org", "accept_waiver": True,
                                                            "accept_privacy": True}, format="json")
        self.assertEqual(caravan.status_code, 400)

    def test_a_cancelled_registration_frees_its_seat(self):
        SiteSettings.objects.update_or_create(pk=1, defaults={"planting_seats": 1})
        self.register(options=["reboisement"])
        EventRequest.objects.update(status="rejected")
        self.assertEqual(self.register(email="b@x.org", options=["reboisement"]).status_code, 201)

    def test_no_limit_by_default(self):
        self.assertEqual(self.client.get("/api/events-planting-seats/").json()["remaining"], None)


class CheckInTests(Base):
    def setUp(self):
        super().setUp()
        self.register(options=["reboisement", "samedi-forum"])
        self.reg = EventRequest.objects.get()
        self.url = badges.badge_url(self.reg)

    def test_scan_once_per_day(self):
        c = self.staff()
        first = c.post("/api/coordination/checkin/", {"code": self.url}, format="json").json()
        self.assertEqual((first["result"], first["name"], first["planting"]), ("ok", "Awa Ndiaye", True))
        again = c.post("/api/coordination/checkin/", {"code": self.reg.badge_token}, format="json").json()
        self.assertEqual(again["result"], "already")
        self.assertTrue(again["today_at"])
        badges.check_in(self.reg, today=date(2026, 12, 12))  # badge valable les deux journées
        self.assertEqual(CheckIn.objects.filter(registration=self.reg).count(), 2)

    def test_cancelled_and_unknown_badges(self):
        c = self.staff()
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": "n-importe-quoi"}, format="json").json()["result"], "invalid")
        EventRequest.objects.update(status="rejected")
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": self.url}, format="json").json()["result"], "cancelled")
        self.assertFalse(CheckIn.objects.exists())

    def test_manual_search_checkin_resend_and_stats(self):
        c = self.staff()
        found = c.get("/api/coordination/checkin/search/", {"q": "awa"}).json()
        self.assertEqual(found[0]["name"], "Awa Ndiaye")
        self.assertEqual(c.post("/api/coordination/checkin/", {"id": found[0]["id"]}, format="json").json()["result"], "ok")
        mail.outbox.clear()
        self.assertEqual(c.post("/api/coordination/checkin/resend/", {"id": found[0]["id"]}, format="json").status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        stats = c.get("/api/coordination/checkin/stats/").json()
        self.assertEqual((stats["registered"], stats["today"], stats["planting_taken"]), (1, 1, 1))

    def test_scanning_is_reserved_to_the_coordination(self):
        self.assertIn(self.client.post("/api/coordination/checkin/", {"code": self.url}, format="json").status_code, (401, 403))
        self.assertIn(self.client.get("/api/coordination/checkin/search/", {"q": "awa"}).status_code, (401, 403))
        self.assertFalse(CheckIn.objects.exists())
