"""Cahier des charges du 20 novembre 2026, lot 2 : références, suivi sans compte, compléments, annulation, réémission,
badge PDF avec catégorie, newsletter facultative, assistance."""
import io
import re
import zipfile
from io import StringIO
from unittest import mock

from django.core import mail, signing
from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase

from apps.contact.models import ContactMessage
from apps.core import dossiers
from apps.events import badges
from apps.events.models import EventRequest
from apps.newsletter.models import NewsletterSubscriber
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

    def press(self, email="j@x.org"):
        return self.client.post("/api/press/accreditation/", {"media": "RFM", "name": "Jo", "phone": "77", "email": email}, format="json")

    def staff(self):
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        return c

    def link_in(self, body):
        return re.search(r"/suivi/([^\s]+)", body).group(1)


class ConfirmationScreenTests(Base):
    def test_registration_returns_reference_status_and_own_links(self):
        data = self.register().json()
        reg = EventRequest.objects.get()
        self.assertEqual((data["reference"], data["status"]), ("GWE-0001", "Confirmée"))
        self.assertIn("présentez votre badge", data["next_step"].lower())
        self.assertIn(f"cle={badges.owner_key(reg.badge_token)}", data["badge_url"])
        self.assertIn("/jy-serai?", data["visual_url"])

    def test_other_requests_get_a_reference_and_a_tracking_link(self):
        data = self.press().json()
        a = PressAccreditation.objects.get()
        self.assertEqual(data["reference"], f"PRE-{a.pk:05d}")
        body = mail.outbox[-1].body
        self.assertIn(f"sous la référence PRE-{a.pk:05d}", body)
        self.assertIn("/suivi/", body)
        self.assertIn("Aucune réponse n'est nécessaire", body)


class TrackingTests(Base):
    def test_same_answer_for_any_address_and_a_link_only_when_a_dossier_exists(self):
        self.register()
        mail.outbox.clear()
        known = self.client.post("/api/suivi/", {"email": "A@X.org"}, format="json").json()
        unknown = self.client.post("/api/suivi/", {"email": "personne@x.org"}, format="json").json()
        self.assertEqual(known, unknown)
        self.assertEqual([m.to for m in mail.outbox], [["A@X.org"]])
        token = self.link_in(mail.outbox[0].body)
        page = self.client.get(f"/api/suivi/{token}/").json()
        self.assertEqual(page["dossiers"][0]["reference"], "GWE-0001")
        self.assertTrue(page["dossiers"][0]["can_cancel"])
        self.assertNotIn("a@x.org", page["email"])  # adresse masquée

    def test_expired_or_forged_link(self):
        self.register()
        self.assertEqual(self.client.get("/api/suivi/faux/").status_code, 410)
        token = dossiers.token_for("a@x.org")
        with mock.patch.object(signing.TimestampSigner, "unsign_object", side_effect=signing.SignatureExpired("expiré")):
            self.assertEqual(self.client.get(f"/api/suivi/{token}/").status_code, 410)

    def test_a_link_only_shows_its_own_address(self):
        self.register()
        self.register(email="b@x.org", name="Moussa Fall")
        rows = self.client.get(f"/api/suivi/{dossiers.token_for('b@x.org')}/").json()["dossiers"]
        self.assertEqual([r["name"] for r in rows], ["Moussa Fall"])
        other = EventRequest.objects.get(email="a@x.org")
        r = self.client.post(f"/api/suivi/{dossiers.token_for('b@x.org')}/event-requests/{other.pk}/annuler/")
        self.assertEqual(r.status_code, 400)
        other.refresh_from_db()
        self.assertEqual(other.status, "accepted")

    def test_the_person_cancels_and_the_badge_no_longer_passes(self):
        self.register()
        reg = EventRequest.objects.get()
        r = self.client.post(f"/api/suivi/{dossiers.token_for('a@x.org')}/event-requests/{reg.pk}/annuler/")
        self.assertEqual(r.status_code, 200, r.content)
        reg.refresh_from_db()
        self.assertEqual(reg.status, "cancelled")
        self.assertEqual(badges.check_in(reg)[0], "cancelled")
        self.assertIn("annulée", mail.outbox[-1].body)


class ComplementTests(Base):
    def test_coordination_asks_for_a_complement_and_the_person_answers(self):
        self.press()
        a = PressAccreditation.objects.get()
        c = self.staff()
        refused = c.post(f"/api/coordination/queue/accreditations/{a.pk}/incomplete/", {}, format="json")
        self.assertEqual(refused.status_code, 400)
        ok = c.post(f"/api/coordination/queue/accreditations/{a.pk}/incomplete/", {"note": "votre carte de presse"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        a.refresh_from_db()
        self.assertEqual(a.status, "incomplete")
        ask = mail.outbox[-1]
        self.assertIn("votre carte de presse", ask.body)
        self.assertIn("Compléter mon dossier", ask.body)

        token = self.link_in(ask.body)
        row = self.client.get(f"/api/suivi/{token}/").json()["dossiers"][0]
        self.assertTrue(row["can_complete"])
        done = self.client.post(f"/api/suivi/{token}/press/{a.pk}/completer/", {"message": "Carte n° 123"}, format="json")
        self.assertEqual(done.status_code, 200, done.content)
        a.refresh_from_db()
        self.assertEqual(a.status, "reviewing")
        self.assertIn("Carte n° 123", a.internal_notes)

    def test_a_decision_is_sent_with_a_tracking_link(self):
        self.press()
        a = PressAccreditation.objects.get()
        self.staff().post(f"/api/coordination/queue/accreditations/{a.pk}/accept/", {}, format="json")
        self.assertIn("est acceptée", mail.outbox[-1].body)
        self.assertIn("/suivi/", mail.outbox[-1].body)


class BadgeTests(Base):
    def test_badge_pdf_attached_with_category_and_download(self):
        self.register()
        reg = EventRequest.objects.get()
        msg = mail.outbox[-1]
        pdfs = [a for a in msg.attachments if getattr(a, "get_content_type", lambda: "")() == "application/pdf"]
        self.assertEqual(len(pdfs), 1)
        self.assertTrue(pdfs[0].get_payload(decode=True).startswith(b"%PDF"))
        self.assertIn("/badge.pdf?cle=", msg.body)
        key = badges.owner_key(reg.badge_token)
        self.assertTrue(self.client.get(f"/api/badges/{reg.badge_token}/badge.pdf", {"cle": key}).content.startswith(b"%PDF"))
        self.assertEqual(self.client.get(f"/api/badges/{reg.badge_token}/badge.pdf").status_code, 404)
        self.assertEqual(self.client.get(f"/api/badges/{reg.badge_token}/", {"cle": key}).json()["category"], "Participant")

    def test_reissue_invalidates_the_old_qr_code(self):
        self.register()
        reg = EventRequest.objects.get()
        old = badges.badge_url(reg)
        c = self.staff()
        r = c.post("/api/coordination/checkin/reissue/", {"id": reg.pk}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": old}, format="json").json()["result"], "invalid")
        reg.refresh_from_db()
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": badges.badge_url(reg)}, format="json").json()["result"], "ok")

    def test_cancelled_badges_are_not_printed(self):
        self.register()
        self.register(email="b@x.org", name="Moussa Fall")
        reg = EventRequest.objects.get(email="b@x.org")
        c = self.staff()
        self.assertEqual(c.post("/api/coordination/checkin/cancel/", {"id": reg.pk}, format="json").status_code, 200)
        data = c.get("/api/coordination/badges/print/").json()
        self.assertEqual([b["name"] for b in data["badges"]], ["Awa Ndiaye"])
        z = zipfile.ZipFile(io.BytesIO(c.get("/api/coordination/badges/qr.zip").content))
        self.assertIn("Participant", z.read("liste-des-badges.csv").decode("utf-8-sig"))


class NewsletterAndHelpTests(Base):
    def test_newsletter_is_optional_and_unchecked(self):
        self.register()
        self.assertFalse(NewsletterSubscriber.objects.exists())
        self.register(email="b@x.org", name="Moussa Fall", newsletter=True)
        self.assertTrue(NewsletterSubscriber.objects.filter(email="b@x.org", is_active=True).exists())
        self.assertEqual(len([m for m in mail.outbox if m.to == ["b@x.org"]]), 1)  # seulement le badge

    def test_assistance_message_reaches_the_coordination(self):
        r = self.client.post("/api/contact/", {"name": "Awa", "email": "a@x.org", "subject": "event_help",
                                               "message": "Référence GWE-0001 : je ne peux pas venir samedi.", "consent": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(ContactMessage.objects.get().subject, "event_help")
