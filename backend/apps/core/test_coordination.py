from io import StringIO

from django.contrib.admin.models import LogEntry
from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.contact.models import ContactMessage
from apps.core.testing import make_org
from apps.memberships.models import MembershipApplication, MembershipCategory
from apps.news.models import Article, ArticleCategory
from apps.organizations.models import Organization, ValidationStatus as VS
from apps.users.models import User

PW = "mot-de-passe-123"


class CoordinationTests(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.boss = User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        self.member = User.objects.create_user("mem", "m@x.org", PW, role=User.Role.MEMBER)

    def login(self, user="boss", password=PW):
        return self.client.post("/api/coordination/login/", {"username": user, "password": password}, format="json")

    def test_anonymous_and_member_cannot_access(self):
        for url in ("/api/coordination/summary/", "/api/coordination/me/", "/api/coordination/content/", "/api/coordination/queue/messages/"):
            self.assertIn(self.client.get(url).status_code, (401, 403), url)
        self.client.force_login(self.member)
        self.assertEqual(self.client.get("/api/coordination/summary/").status_code, 403)

    def test_login_rules(self):
        r = self.login()
        self.assertEqual((r.status_code, r.json()["role"]), (200, "COORDINATION"))
        bad, nonstaff = self.login(password="faux"), self.login("mem")
        self.assertEqual((bad.status_code, nonstaff.status_code), (400, 400))
        self.assertEqual(bad.json(), nonstaff.json())  # pas d'indice sur l'existence ou le rôle du compte

    def test_logout_ends_session(self):
        self.login()
        self.assertEqual(self.client.get("/api/coordination/me/").status_code, 200)
        self.client.post("/api/coordination/logout/")
        self.assertIn(self.client.get("/api/coordination/me/").status_code, (401, 403))

    def test_summary_counts_pending_work(self):
        make_org("En attente", status=VS.PENDING, published=False)
        ContactMessage.objects.create(name="N", email="n@x.org", subject="other", message="m", consent=True)
        MembershipApplication.objects.create(organization_or_name="X", category=MembershipCategory.objects.first(), representative="R",
                                             phone="1", email="a@x.org", accept_charter=True, accept_privacy=True)
        self.login()
        data = self.client.get("/api/coordination/summary/").json()
        counts = {q["kind"]: q["count"] for q in data["queues"]}
        self.assertEqual((counts["organizations"], counts["messages"], counts["memberships"]), (1, 1, 1))
        self.assertEqual(data["to_handle"], 3)

    def test_organization_workflow_and_audit_trail(self):
        org = make_org("À valider", status=VS.PENDING, published=False)
        self.login()
        act = lambda a: self.client.post(f"/api/coordination/queue/organizations/{org.pk}/{a}/")
        self.assertEqual(act("publish").status_code, 400)  # pas publiable avant acceptation
        self.assertEqual(act("accept").status_code, 200)
        org.refresh_from_db()
        self.assertEqual((org.validation_status, org.is_published, org.reviewed_by), (VS.ACCEPTED, False, self.boss))
        self.assertEqual(self.client.get("/api/coordination/queue/organizations/").json()["items"][0]["state"], "Acceptée, pas encore publiée")
        self.assertEqual(act("publish").status_code, 200)
        self.assertTrue(Organization.objects.public().filter(pk=org.pk).exists())
        self.assertEqual(self.client.get("/api/coordination/queue/organizations/").json()["items"], [])
        self.assertEqual(LogEntry.objects.filter(user=self.boss).count(), 2)

    def test_reject_and_handle_actions(self):
        app = MembershipApplication.objects.create(organization_or_name="X", category=MembershipCategory.objects.first(), representative="R",
                                                   phone="1", email="a@x.org", accept_charter=True, accept_privacy=True)
        msg = ContactMessage.objects.create(name="N", email="n@x.org", subject="other", message="m", consent=True)
        self.login()
        self.assertEqual(self.client.post(f"/api/coordination/queue/memberships/{app.pk}/reject/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/coordination/queue/messages/{msg.pk}/handle/").status_code, 200)
        app.refresh_from_db(); msg.refresh_from_db()
        self.assertEqual((app.status, msg.is_handled), ("rejected", True))
        self.assertEqual(self.client.post(f"/api/coordination/queue/memberships/{app.pk}/reject/").status_code, 404)  # déjà traité
        self.assertEqual(self.client.post(f"/api/coordination/queue/memberships/{app.pk}/delete/").status_code, 404)

    def test_unknown_action_is_refused(self):
        org = make_org("X", status=VS.PENDING, published=False)
        self.login()
        self.assertEqual(self.client.post(f"/api/coordination/queue/organizations/{org.pk}/explode/").status_code, 400)

    def test_publish_and_unpublish_article(self):
        a = Article.objects.create(title="Brouillon", category=ArticleCategory.objects.first())
        self.login()
        self.assertEqual(self.client.get("/api/coordination/content/").json()["articles"][0]["state"], "Brouillon")
        self.client.post(f"/api/coordination/content/articles/{a.pk}/publish/")
        self.assertEqual(list(Article.objects.public()), [a])
        self.client.post(f"/api/coordination/content/articles/{a.pk}/unpublish/")
        self.assertEqual(Article.objects.public().count(), 0)
        self.assertEqual(self.client.post(f"/api/coordination/content/users/{a.pk}/publish/").status_code, 404)
