from apps.organizations.models import College, Organization, Pole, Sector, ValidationStatus


def make_org(name="Organisation Exemple", status=ValidationStatus.ACCEPTED, published=True, **kw):
    kw.setdefault("college", College.objects.get_or_create(slug="college-exemple", defaults={"name": "Collège Exemple"})[0])
    kw.setdefault("sector", Sector.objects.get_or_create(slug="secteur-exemple", defaults={"name": "Secteur Exemple"})[0])
    kw.setdefault("pole", Pole.DIAMNIADIO)
    return Organization.objects.create(name=name, validation_status=status, is_published=published, **kw)
