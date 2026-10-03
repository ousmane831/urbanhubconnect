from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.models import ProtectedError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.core.testing import make_org
from apps.map.models import MapCategory, MapPlace
from apps.organizations.models import Pole


def make_place(name="Lieu Exemple", category=None, **kw):
    category = category or MapCategory.objects.get_or_create(slug="cat-exemple", defaults={"name": "Catégorie Exemple"})[0]
    kw.setdefault("latitude", Decimal("14.72"))
    kw.setdefault("longitude", Decimal("-17.18"))
    kw.setdefault("is_published", True)
    return MapPlace.objects.create(name=name, category=category, **kw)


class MapModelTests(TestCase):
    def test_category_slug_and_ordering(self):
        b = MapCategory.objects.create(name="Beta", display_order=2)
        a = MapCategory.objects.create(name="Alpha", display_order=1)
        self.assertEqual(a.slug, "alpha")
        self.assertEqual(list(MapCategory.objects.all()), [a, b])

    def test_category_in_use_is_protected(self):
        p = make_place()
        with self.assertRaises(ProtectedError):
            p.category.delete()

    def test_place_without_organization_is_valid(self):
        p = make_place()
        p.full_clean()
        self.assertFalse(p.is_member)
        self.assertEqual(p.slug, "lieu-exemple")

    def test_place_inherits_public_data_but_never_private_contacts(self):
        o = make_org(address="Rue 1", latitude=Decimal("14.70"), longitude=Decimal("-17.10"),
                     phone="SECRET-PHONE", email="SECRET-MAIL@x.org", description="Desc", pole=Pole.LAC_ROSE)
        p = make_place("Siège", latitude=None, longitude=None, organization=o)
        self.assertEqual((p.address, p.latitude, p.pole, p.description), ("Rue 1", Decimal("14.70"), Pole.LAC_ROSE, "Desc"))
        self.assertEqual((p.phone, p.email), ("", ""))
        self.assertTrue(p.is_member)

    def test_coordinates_required_and_bounded(self):
        cat = MapCategory.objects.create(name="C")
        for lat, lon in [(None, None), (Decimal("95"), Decimal("-17")), (Decimal("-17.1"), Decimal("14.7"))]:
            with self.assertRaises(ValidationError):
                MapPlace(name="X", category=cat, latitude=lat, longitude=lon).full_clean()

    def test_deleting_organization_keeps_place(self):
        o = make_org()
        p = make_place(organization=o)
        o.delete()
        p.refresh_from_db()
        self.assertIsNone(p.organization)


class MapApiTests(APITestCase):
    def results(self, **params):
        return self.client.get(reverse("mapplace-list"), params).json()

    def test_unpublished_and_inactive_category_hidden(self):
        make_place("Visible")
        make_place("Masqué", is_published=False)
        inactive = MapCategory.objects.create(name="Inactive", is_active=False)
        make_place("Catégorie inactive", category=inactive)
        self.assertEqual([p["name"] for p in self.results()], ["Visible"])
        self.assertEqual(self.client.get(reverse("mapplace-detail", args=["masque"])).status_code, 404)

    def test_filters_and_search(self):
        sante = MapCategory.objects.create(name="Santé")
        make_place("Clinique", category=sante, pole=Pole.DIAMNIADIO, address="Avenue Léopold")
        make_place("Hôtel", pole=Pole.LAC_ROSE)
        self.assertEqual([p["name"] for p in self.results(category="sante")], ["Clinique"])
        self.assertEqual([p["name"] for p in self.results(pole="LAC_ROSE")], ["Hôtel"])
        self.assertEqual([p["name"] for p in self.results(search="Léopold")], ["Clinique"])

    def test_organization_link_only_when_public(self):
        public, hidden = make_org("Publique"), make_org("Cachée", published=False)
        make_place("Lieu A", organization=public)
        make_place("Lieu B", organization=hidden)
        by_name = {p["name"]: p for p in self.results()}
        self.assertEqual(by_name["Lieu A"]["organization"], {"name": "Publique", "slug": "publique"})
        self.assertTrue(by_name["Lieu A"]["is_member"])
        self.assertIsNone(by_name["Lieu B"]["organization"])
        self.assertFalse(by_name["Lieu B"]["is_member"])

    def test_no_private_organization_data_in_response(self):
        o = make_org(phone="SECRET-PHONE", email="SECRET-MAIL@x.org", offers="SECRET-OFFER")
        make_place(organization=o)
        body = self.client.get(reverse("mapplace-list")).content.decode()
        for secret in ("SECRET-PHONE", "SECRET-MAIL", "SECRET-OFFER"):
            self.assertNotIn(secret, body)

    def test_categories_endpoint_lists_active_only(self):
        MapCategory.objects.create(name="Active")
        MapCategory.objects.create(name="Inactive", is_active=False)
        names = [c["name"] for c in self.client.get(reverse("map-categories")).json()]
        self.assertEqual(names, ["Active"])

    def test_read_only(self):
        self.assertEqual(self.client.post(reverse("mapplace-list"), {}).status_code, 405)
