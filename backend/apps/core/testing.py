from apps.organizations.models import College, Organization, Pole, Sector, ValidationStatus


def _taxonomy_value(field_name, model, slug, name):
    """Valeur valable pour le champ, qu'il soit une relation (objet) ou un champ texte (avec ou sans choix)."""
    field = Organization._meta.get_field(field_name)
    if field.is_relation:
        return model.objects.get_or_create(slug=slug, defaults={"name": name})[0]
    if field.choices:
        return field.choices[0][0]
    return slug


def make_org(name="Organisation Exemple", status=ValidationStatus.ACCEPTED, published=True, **kw):
    kw.setdefault("college", _taxonomy_value("college", College, "college-exemple", "Collège Exemple"))
    kw.setdefault("sector", _taxonomy_value("sector", Sector, "secteur-exemple", "Secteur Exemple"))
    kw.setdefault("pole", Pole.DIAMNIADIO)
    return Organization.objects.create(name=name, validation_status=status, is_published=published, **kw)
