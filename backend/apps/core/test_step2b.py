from io import StringIO

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from zoneinfo import ZoneInfo

from apps.contact.models import ContactMessage
from apps.core.testing import make_org
from apps.core.validators import validate_pdf
from apps.documents.models import Document
from apps.events.models import Event
from apps.map.models import MapCategory, MapPlace, PlaceSuggestion
from apps.memberships.models import MembershipApplication, MembershipCategory
from apps.news.models import Article, ArticleCategory
from apps.newsletter.models import NewsletterSubscriber
from apps.partnerships.models import Partner
from apps.users.models import User


class Step2bBase(TestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.admin = User.objects.create_superuser("root", "root@x.org", "pw")


class MembershipTests(Step2bBase):
    def make(self, **kw):
        kw.setdefault("accept_charter", True)
        kw.setdefault("accept_privacy", True)
        return MembershipApplication.objects.create(
            organization_or_name="Exemple SA", category=MembershipCategory.objects.first(),
            representative="R. Exemple", phone="000", email="a@exemple.org", **kw)

    def test_consents_are_mandatory(self):
        with self.assertRaises(ValidationError):
            self.make(accept_charter=False).full_clean()
        self.make().full_clean()

    def test_default_status_and_accept_action(self):
        app = self.make()
        self.assertEqual(app.status, "pending")
        self.client.force_login(self.admin)
        self.client.post(reverse("admin:memberships_membershipapplication_changelist"),
                         {"action": "accept", "index": 0, "_selected_action": [app.pk]})
        app.refresh_from_db()
        self.assertEqual(app.status, "accepted")


class ContentTests(Step2bBase):
    def test_only_confirmed_partners(self):
        logo = SimpleUploadedFile("l.png", b"x")
        Partner.objects.create(name="Confirmé", logo="a.png", is_confirmed=True)
        Partner.objects.create(name="Non confirmé", logo="b.png")
        self.assertEqual([p.name for p in Partner.objects.confirmed()], ["Confirmé"])

    def test_article_public_hides_drafts_and_scheduled(self):
        cat = ArticleCategory.objects.first()
        now = timezone.now()
        Article.objects.create(title="Publié", category=cat, is_published=True, published_at=now - timedelta(days=1))
        Article.objects.create(title="Brouillon", category=cat, is_published=False)
        Article.objects.create(title="Programmé", category=cat, is_published=True, published_at=now + timedelta(days=1))
        self.assertEqual([a.title for a in Article.objects.public()], ["Publié"])

    def test_article_slug_and_published_at_autofilled(self):
        a = Article.objects.create(title="Mon article", category=ArticleCategory.objects.first(), is_published=True)
        self.assertEqual(a.slug, "mon-article")
        self.assertIsNotNone(a.published_at)

    def test_newsletter_blocks_case_duplicates(self):
        NewsletterSubscriber.objects.create(email="A@X.org")
        with self.assertRaises(ValidationError):
            NewsletterSubscriber(email="a@x.ORG").full_clean()

    def test_documents_public_filter_and_pdf_validator(self):
        Document.objects.create(title="Public", file="a.pdf", category="brochure", is_public=True)
        Document.objects.create(title="Privé", file="b.pdf", category="charter")
        self.assertEqual([d.title for d in Document.objects.public()], ["Public"])
        validate_pdf(SimpleUploadedFile("ok.pdf", b"%PDF-1.4 contenu"))
        for bad in (SimpleUploadedFile("x.pdf", b"pas un pdf"), SimpleUploadedFile("x.exe", b"%PDF-1.4")):
            with self.assertRaises(ValidationError):
                validate_pdf(bad)


class AdminWorkflowTests(Step2bBase):
    def test_contact_messages_cannot_be_added_in_admin(self):
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(reverse("admin:contact_contactmessage_add")).status_code, 403)

    def test_suggestion_converted_to_hidden_place(self):
        s = PlaceSuggestion.objects.create(name="Café Exemple", category=MapCategory.objects.first(),
                                           latitude="14.72", longitude="-17.18",
                                           submitter_name="S", submitter_email="s@x.org")
        no_coords = PlaceSuggestion.objects.create(name="Sans coordonnées", category=MapCategory.objects.first(),
                                                   submitter_name="S", submitter_email="s@x.org")
        self.client.force_login(self.admin)
        self.client.post(reverse("admin:map_placesuggestion_changelist"),
                         {"action": "create_place", "index": 0, "_selected_action": [s.pk, no_coords.pk]})
        place = MapPlace.objects.get(name="Café Exemple")
        self.assertFalse(place.is_published)
        s.refresh_from_db()
        self.assertEqual(s.status, "accepted")
        self.assertFalse(MapPlace.objects.filter(name="Sans coordonnées").exists())

    def test_coordination_role_gets_working_but_limited_admin(self):
        coord = User.objects.create_user("coord", "c@x.org", "pw", role=User.Role.COORDINATION)
        self.assertTrue(coord.groups.filter(name="Coordination").exists())
        org = make_org()
        self.client.force_login(coord)
        self.assertEqual(self.client.get(reverse("admin:organizations_organization_changelist")).status_code, 200)
        self.assertEqual(self.client.get(reverse("admin:organizations_organization_change", args=[org.pk])).status_code, 200)
        self.assertEqual(self.client.get(reverse("admin:organizations_organization_delete", args=[org.pk])).status_code, 403)
        self.assertEqual(self.client.get(reverse("admin:users_user_changelist")).status_code, 403)


class SeedContentTests(Step2bBase):
    def test_launch_event_and_draft_article(self):
        ev = Event.objects.get(slug="grand-week-end-du-pole-2026")
        start = ev.start_date.astimezone(ZoneInfo("Africa/Dakar"))
        self.assertEqual((start.year, start.month, start.day), (2026, 12, 11))
        self.assertTrue(ev.is_published)
        art = Article.objects.get(slug="urban-hub-connect-lancement-11-13-decembre-2026")
        self.assertFalse(art.is_published)
        self.assertEqual(Article.objects.public().count(), 0)

    def test_seed_is_idempotent_for_content(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.assertEqual((Event.objects.count(), Article.objects.count(), Group.objects.filter(name="Coordination").count()), (1, 1, 1))
