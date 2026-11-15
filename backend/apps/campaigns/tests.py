"""Campagnes d'e-mails : import Excel, ciblage, calendrier, plafond, désinscription, accès réservé à la Coordination."""
import io
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from openpyxl import Workbook
from rest_framework.test import APIClient, APITestCase

from apps.users.models import User

from . import sender
from .importer import import_contacts
from .models import Campaign, Contact, Delivery

DAKAR = ZoneInfo("Africa/Dakar")
PW = "Mot-de-passe-123"


def xlsx(rows):
    wb = Workbook()
    for r in rows:
        wb.active.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def at(y, m, d, h=10, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=DAKAR)


class ImportTests(TestCase):
    def test_excel_columns_found_by_title_in_any_order(self):
        data = xlsx([["Organisation", "Secteur d'activité", "E-mail", "Segment"],
                     ["Exemple SA", "BTP", " Contact@Exemple.SN ", "Partenaire"],
                     ["Sans mail", "BTP", "", "Partenaire"],
                     ["Autre", "Banque", "pas-un-mail", "Sponsor"]])
        r = import_contacts("contacts.xlsx", data)
        self.assertEqual((r["created"], r["skipped_count"]), (1, 2))
        c = Contact.objects.get()
        self.assertEqual((c.email, c.organization, c.activity, c.segment), ("contact@exemple.sn", "Exemple SA", "BTP", "Partenaire"))

    def test_reimport_updates_and_never_resubscribes(self):
        Contact.objects.create(email="a@x.sn", organization="Ancien nom", unsubscribed_at=at(2026, 11, 1))
        r = import_contacts("c.csv", "email;organisation\na@x.sn;Nouveau nom\nb@x.sn;B\n".encode("cp1252"))
        self.assertEqual((r["created"], r["updated"], r["unsubscribed_kept"]), (1, 1, 1))
        a = Contact.objects.get(email="a@x.sn")
        self.assertEqual(a.organization, "Nouveau nom")
        self.assertIsNotNone(a.unsubscribed_at)

    def test_every_sheet_of_the_workbook_is_read(self):
        from openpyxl import Workbook
        wb = Workbook()
        wb.active.title = "Industriels"
        wb.active.append(["E-mail", "Organisation"]); wb.active.append(["a@x.sn", "A"])
        hotels = wb.create_sheet("Hôtels")
        hotels.append(["Liste des hôtels"]); hotels.append([]); hotels.append(["Organisation", "Mail"]); hotels.append(["B", "b@x.sn"])
        notes = wb.create_sheet("Notes")
        notes.append(["Remarque"]); notes.append(["À relancer en décembre"])
        buf = io.BytesIO(); wb.save(buf)
        r = import_contacts("c.xlsx", buf.getvalue())
        self.assertEqual(r["created"], 2)
        self.assertEqual((r["sheets"], r["ignored_sheets"]), (["Industriels", "Hôtels"], ["Notes"]))

    def test_file_without_email_column_is_refused(self):
        from .importer import ImportError_
        with self.assertRaises(ImportError_):
            import_contacts("c.xlsx", xlsx([["Nom", "Téléphone"], ["Awa", "77"]]))


class ScheduleTests(TestCase):
    def setUp(self):
        Contact.objects.create(email="a@x.sn", organization="A", segment="Partenaire", activity="BTP")
        Contact.objects.create(email="b@x.sn", organization="B", segment="Sponsor", activity="Banque")
        Contact.objects.create(email="c@x.sn", organization="C", segment="Partenaire", activity="Banque", unsubscribed_at=at(2026, 11, 1))

    def campaign(self, **kw):
        kw = {"title": "GWE", "subject": "Le Grand Week-End, {organisation}", "body": "Bonjour {nom},\n\nRendez-vous les 11 et 12 décembre.",
              "start_date": date(2026, 11, 16), "status": Campaign.Status.ACTIVE, **kw}
        return Campaign.objects.create(**kw)

    def test_targets_segments_and_skips_unsubscribed(self):
        c = self.campaign(segments=["Partenaire"])
        self.assertEqual([x.email for x in sender.recipients(c)], ["a@x.sn"])

    def test_once_sends_at_its_time_only_once_then_finishes(self):
        c = self.campaign(send_time=time(9, 0))
        self.assertEqual(sender.run(at(2026, 11, 16, 8, 45)), {})
        self.assertEqual(sender.run(at(2026, 11, 16, 9, 0)), {"GWE": 2})
        self.assertEqual(sender.run(at(2026, 11, 16, 9, 15)), {})
        c.refresh_from_db()
        self.assertEqual(c.status, Campaign.Status.DONE)
        msg = next(m for m in mail.outbox if m.to == ["a@x.sn"])
        self.assertEqual(msg.subject, "Le Grand Week-End, A")
        self.assertIn("Bonjour A,", msg.body)
        self.assertIn("/desinscription/", msg.body)
        self.assertIn("List-Unsubscribe", msg.extra_headers)
        self.assertIn("Rendez-vous les 11 et 12", msg.alternatives[0][0])

    def test_weekly_sends_each_chosen_day_until_the_end_date(self):
        self.campaign(frequency=Campaign.Frequency.WEEKLY, weekday=0, end_date=date(2026, 11, 30))  # lundis 16, 23, 30
        sent = sum(sum(sender.run(at(2026, 11, d)).values()) for d in range(16, 31))
        sender.run(at(2026, 12, 1))
        self.assertEqual(sent, 6)
        self.assertEqual(sorted({d.occurrence.day for d in Delivery.objects.all()}), [16, 23, 30])
        self.assertEqual(Campaign.objects.get().status, Campaign.Status.DONE)  # passé le 30 : terminée

    def test_weekend_means_saturday(self):
        self.campaign(frequency=Campaign.Frequency.WEEKEND)
        self.assertEqual(sender.run(at(2026, 11, 20)), {})   # vendredi
        self.assertEqual(sender.run(at(2026, 11, 21)), {"GWE": 2})  # samedi

    @override_settings(CAMPAIGN_DAILY_LIMIT=1)
    def test_daily_limit_is_respected_and_the_rest_follows(self):
        self.campaign()
        self.assertEqual(sender.run(at(2026, 11, 16)), {"GWE": 1})
        self.assertEqual(sender.run(at(2026, 11, 16, 11)), {})
        self.assertEqual(sender.run(at(2026, 11, 17)), {"GWE": 1})  # envoi unique : rattrapé le lendemain

    def test_paused_campaign_sends_nothing(self):
        self.campaign(status=Campaign.Status.PAUSED)
        self.assertEqual(sender.run(at(2026, 11, 16)), {})

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", CAMPAIGN_EMAIL_HOST="")
    def test_nothing_leaves_through_the_site_mailbox_when_brevo_is_not_configured(self):
        self.campaign()
        self.assertTrue(sender.config_problem())
        self.assertEqual(sender.run(at(2026, 11, 16)), {})
        self.assertFalse(Delivery.objects.exists())


class ApiTests(APITestCase):
    def setUp(self):
        User.objects.create_user("boss", "boss@x.sn", PW, role=User.Role.COORDINATION)
        self.staff = APIClient()
        self.staff.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        Contact.objects.create(email="a@x.sn", organization="A", segment="Partenaire")

    def payload(self, **kw):
        return {"title": "GWE", "subject": "Objet", "body": "Bonjour {nom}", "frequency": "weekly", "weekday": 0,
                "send_time": "09:00", "start_date": "2026-11-16", "end_date": "2026-12-10", "segments": ["Partenaire"], **kw}

    def test_staff_only(self):
        self.assertIn(APIClient().get("/api/coordination/campaigns/").status_code, (401, 403))
        self.assertEqual(self.staff.get("/api/coordination/campaigns/").status_code, 200)

    def test_import_create_test_and_activate(self):
        f = SimpleUploadedFile("c.xlsx", xlsx([["E-mail", "Organisation", "Segment"], ["b@x.sn", "B", "Partenaire"]]))
        r = self.staff.post("/api/coordination/campaigns/contacts/import/", {"file": f}, format="multipart")
        self.assertEqual(r.json()["created"], 1, r.content)

        r = self.staff.post("/api/coordination/campaigns/new/", self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertEqual((body["recipients"], body["status"]), (2, "draft"))

        r = self.staff.post(f"/api/coordination/campaigns/{body['id']}/test/", {}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(mail.outbox[-1].to, ["boss@x.sn"])
        self.assertTrue(mail.outbox[-1].subject.startswith("[TEST]"))
        self.assertFalse(Delivery.objects.exists())  # un test ne compte pas comme envoi

        r = self.staff.post(f"/api/coordination/campaigns/{body['id']}/activate/", {}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        r = self.staff.put(f"/api/coordination/campaigns/{body['id']}/", self.payload(subject="Autre"), format="json")
        self.assertEqual(r.status_code, 400)  # modification seulement en pause

    def test_validation(self):
        r = self.staff.post("/api/coordination/campaigns/new/", self.payload(end_date="2026-11-01"), format="json")
        self.assertEqual(r.status_code, 400)
        r = self.staff.post("/api/coordination/campaigns/new/", self.payload(cta_label="S'inscrire"), format="json")
        self.assertEqual(r.status_code, 400)

    def test_preview(self):
        r = self.staff.post("/api/coordination/campaigns/preview/", {"subject": "Bonjour {organisation}", "body": "Texte"}, format="json")
        self.assertEqual(r.json()["subject"], "Bonjour A")
        self.assertIn("<html", r.json()["html"])

    def test_public_unsubscribe(self):
        c = Contact.objects.get()
        anon = APIClient(enforce_csrf_checks=True)
        r = anon.get(f"/api/unsubscribe/{c.token}/")
        self.assertEqual(r.json(), {"email": "a•@x.sn", "unsubscribed": False})
        r = anon.post(f"/api/unsubscribe/{c.token}/")
        self.assertEqual(r.json()["unsubscribed"], True)
        c.refresh_from_db()
        self.assertIsNotNone(c.unsubscribed_at)
        self.assertEqual(anon.get("/api/unsubscribe/00000000-0000-0000-0000-000000000000/").status_code, 404)
