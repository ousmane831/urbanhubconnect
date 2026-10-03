from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.events.models import EventCategory
from apps.map.models import MapCategory, MapPlace
from apps.memberships.models import MembershipCategory
from apps.news.models import ArticleCategory
from apps.organizations.models import College, Commission, Organization, Sector
from apps.partnerships.models import PartnershipTier
from apps.users.models import User

EXPECTED = {Commission: 8, College: 4, Sector: 15, MapCategory: 9, EventCategory: 4,
            ArticleCategory: 4, MembershipCategory: 6, PartnershipTier: 5}


class SeedTests(TestCase):
    def seed(self):
        call_command("seed_initial_data", stdout=StringIO())

    def test_seed_counts_and_idempotency(self):
        self.seed()
        self.seed()
        for model, n in EXPECTED.items():
            self.assertEqual(model.objects.count(), n, model.__name__)

    def test_seed_creates_no_fake_content(self):
        self.seed()
        self.assertEqual((Organization.objects.count(), MapPlace.objects.count()), (0, 0))

    def test_seed_preserves_admin_edits(self):
        self.seed()
        MembershipCategory.objects.filter(amount_fcfa=10_000).update(amount_fcfa=12_000)
        c = Commission.objects.get(number=1)
        c.name = "Renommée"
        c.save()
        self.seed()
        self.assertEqual(Commission.objects.count(), 8)
        self.assertEqual(Commission.objects.get(number=1).name, "Renommée")
        self.assertTrue(MembershipCategory.objects.filter(amount_fcfa=12_000).exists())

    def test_membership_amounts(self):
        self.seed()
        amounts = sorted(MembershipCategory.objects.values_list("amount_fcfa", flat=True))
        self.assertEqual(amounts, [10_000, 25_000, 25_000, 50_000, 150_000, 500_000])


class UserRoleTests(TestCase):
    def test_roles_drive_staff_flag(self):
        mk = lambda n, role: User.objects.create_user(n, f"{n}@x.org", "pw", role=role)
        self.assertTrue(mk("a", User.Role.ADMIN).is_staff)
        self.assertTrue(mk("c", User.Role.COORDINATION).is_staff)
        self.assertFalse(mk("m", User.Role.MEMBER).is_staff)

    def test_superuser_is_admin_and_password_is_hashed(self):
        u = User.objects.create_superuser("root", "root@x.org", "pw")
        self.assertEqual(u.role, User.Role.ADMIN)
        self.assertNotEqual(u.password, "pw")
