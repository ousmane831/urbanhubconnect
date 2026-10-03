from datetime import timedelta
from io import StringIO

from django.core import mail
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.contact.models import ContactMessage
from apps.documents.models import Document
from apps.events.models import Event, EventCategory, VolunteerApplication
from apps.map.models import PlaceSuggestion
from apps.memberships.models import MembershipApplication
from apps.news.models import Article, ArticleCategory
from apps.newsletter.models import NewsletterSubscriber
from apps.organizations.models import College, Commission, Organization, Sector, ValidationStatus
from apps.partnerships.models import Partner


class FormsBase(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())

    def post(self, url, data, **kw):
        return self.client.post(url, data, format="json", **kw)


class FormSubmissionTests(FormsBase):
    def membership_payload(self, **kw):
        from apps.memberships.models import MembershipCategory
        return {"organization_or_name": "Exemple SA", "category": MembershipCategory.objects.first().slug,
                "representative": "R. Exemple", "phone": "000", "email": "a@exemple.org",
                "accept_charter": True, "accept_privacy": True, **kw}

    def test_membership_created_pending(self):
        r = self.post("/api/memberships/", self.membership_payload())
        self.assertEqual(r.status_code, 201)
        self.assertEqual(MembershipApplication.objects.get().status, "pending")

    def test_membership_requires_consents_and_valid_email(self):
        r = self.post("/api/memberships/", self.membership_payload(accept_privacy=False))
        self.assertEqual(r.status_code, 400)
        self.assertIn("accept_privacy", r.json())
        self.assertEqual(self.post("/api/memberships/", self.membership_payload(email="pas-un-email")).status_code, 400)
        self.assertEqual(MembershipApplication.objects.count(), 0)

    def test_status_cannot_be_forced_by_client(self):
        self.post("/api/memberships/", self.membership_payload(status="accepted"))
        self.assertEqual(MembershipApplication.objects.get().status, "pending")

    def test_honeypot_fakes_success_without_saving(self):
        r = self.post("/api/memberships/", self.membership_payload(company_website="http://spam.example"))
        self.assertEqual(r.status_code, 201)
        self.assertEqual(MembershipApplication.objects.count(), 0)

    def test_contact_saved_and_emailed(self):
        r = self.post("/api/contact/", {"name": "N", "email": "n@x.org", "subject": "press", "message": "Bonjour", "consent": True})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(ContactMessage.objects.get().email_sent)
        self.assertEqual(mail.outbox[0].to, ["infosurbanhubconnect@gmail.com"])
        self.assertEqual(mail.outbox[0].reply_to, ["n@x.org"])

    def test_contact_rejects_unknown_subject_and_missing_consent(self):
        base = {"name": "N", "email": "n@x.org", "message": "m"}
        self.assertEqual(self.post("/api/contact/", {**base, "subject": "nope", "consent": True}).status_code, 400)
        self.assertEqual(self.post("/api/contact/", {**base, "subject": "other", "consent": False}).status_code, 400)

    def test_newsletter_is_idempotent_and_case_insensitive(self):
        for email in ("A@X.org", "a@x.org"):
            self.assertEqual(self.post("/api/newsletter/", {"email": email}).status_code, 201)
        self.assertEqual(NewsletterSubscriber.objects.count(), 1)
        self.assertEqual(self.post("/api/newsletter/", {"email": "bad"}).status_code, 400)

    def test_organization_submit_is_pending_unpublished_and_not_mass_assignable(self):
        data = {"name": "Nouvelle Org", "college": College.objects.first().slug, "sector": Sector.objects.first().slug,
                "pole": "DIAMNIADIO", "representative_name": "R", "phone": "1", "email": "o@x.org",
                "commissions": [Commission.objects.first().slug], "accept_charter": True, "accept_privacy": True,
                "validation_status": "accepted", "is_published": True, "member_founder": True}
        r = self.post("/api/organizations/submit/", data)
        self.assertEqual(r.status_code, 201)
        self.assertIn("72 heures", r.json()["detail"])
        org = Organization.objects.get()
        self.assertEqual((org.validation_status, org.is_published, org.member_founder), (ValidationStatus.PENDING, False, False))
        self.assertEqual(org.commissions.count(), 1)
        self.assertEqual(self.client.get("/api/organizations/").json()["count"], 0)

    def test_organization_submit_rejects_bad_coordinates(self):
        data = {"name": "X", "college": College.objects.first().slug, "sector": Sector.objects.first().slug,
                "pole": "LAC_ROSE", "latitude": "95", "longitude": "-17", "accept_charter": True, "accept_privacy": True}
        self.assertEqual(self.post("/api/organizations/submit/", data).status_code, 400)

    def test_place_suggestion_and_volunteer(self):
        from apps.events.models import VolunteerMission
        from apps.map.models import MapCategory
        r = self.post("/api/map/suggest/", {"name": "Lieu", "category": MapCategory.objects.first().slug,
                                             "latitude": "14.72", "longitude": "-17.18",
                                             "submitter_name": "S", "submitter_email": "s@x.org"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(PlaceSuggestion.objects.get().status, "pending")
        r = self.post("/api/volunteers/", {"name": "V", "email": "v@x.org", "phone": "1",
                                            "missions": [VolunteerMission.objects.first().slug]})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(VolunteerApplication.objects.get().missions.count(), 1)

    def test_form_endpoints_are_write_only(self):
        for url in ("/api/memberships/", "/api/contact/", "/api/newsletter/", "/api/organizations/submit/"):
            self.assertEqual(self.client.get(url).status_code, 405, url)


class PublicReadTests(FormsBase):
    def test_articles_events_documents_partners_hide_unpublished(self):
        cat = ArticleCategory.objects.first()
        now = timezone.now()
        Article.objects.create(title="Visible", category=cat, is_published=True, published_at=now - timedelta(hours=1))
        Article.objects.create(title="Brouillon", category=cat)
        Event.objects.create(title="Caché", category=EventCategory.objects.first(), start_date=now, is_published=False)
        Document.objects.create(title="Privé", file="a.pdf", category="charter")
        Partner.objects.create(name="Non confirmé", logo="l.png")
        titles = [a["title"] for a in self.client.get("/api/articles/").json()["results"]]
        self.assertEqual(titles, ["Visible"])
        self.assertEqual(self.client.get("/api/articles/brouillon/").status_code, 404)
        self.assertNotIn("Caché", [e["title"] for e in self.client.get("/api/events/").json()["results"]])
        self.assertEqual(self.client.get("/api/documents/").json(), [])
        self.assertEqual(self.client.get("/api/partnerships/partners/").json(), [])

    def test_launch_event_exposed_and_filters(self):
        r = self.client.get("/api/events/grand-week-end-du-pole-2026/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get("/api/events/", {"upcoming": "false"}).json()["count"], 0
                         if Event.objects.get().start_date > timezone.now() else 1)

    def test_reference_lists(self):
        self.assertEqual(len(self.client.get("/api/memberships/categories/").json()), 6)
        self.assertEqual(len(self.client.get("/api/partnerships/tiers/").json()), 5)
        self.assertEqual(self.client.get("/api/site-settings/").json()["whatsapp"], "221783095656")


class ReferenceEndpointsTests(FormsBase):
    def test_public_reference_lists(self):
        from apps.events.models import AwardCategory
        AwardCategory.objects.create(name="Award Exemple")
        AwardCategory.objects.create(name="Inactive", is_active=False)
        self.assertEqual(len(self.client.get("/api/events/categories/").json()), 4)
        self.assertEqual(len(self.client.get("/api/articles/categories/").json()), 4)
        self.assertEqual(len(self.client.get("/api/volunteers/missions/").json()), 6)
        self.assertEqual([a["name"] for a in self.client.get("/api/awards/categories/").json()], ["Award Exemple"])


class SeoTests(FormsBase):
    def test_sitemap_lists_only_public_content(self):
        from apps.core.testing import make_org
        make_org("Visible Org")
        make_org("Cachée Org", published=False)
        body = self.client.get("/sitemap.xml").content.decode()
        self.assertIn("/annuaire/visible-org", body)
        self.assertNotIn("cachee-org", body)
        self.assertIn("/evenements/grand-week-end-du-pole-2026", body)
        self.assertNotIn("espace-membres", body)
        self.assertNotIn("urban-hub-connect-lancement", body)  # article en brouillon

    def test_robots_blocks_admin_and_api_and_points_to_sitemap(self):
        body = self.client.get("/robots.txt").content.decode()
        self.assertIn("Disallow: /admin/", body)
        self.assertIn("Disallow: /api/", body)
        self.assertIn("sitemap.xml", body)
