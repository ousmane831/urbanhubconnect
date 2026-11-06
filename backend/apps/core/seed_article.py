"""Premier article du cahier des charges. Créé publié ; un ancien brouillon « [à compléter] » est remplacé,
mais un article déjà modifié dans l'admin n'est jamais écrasé."""
from django.utils import timezone

from apps.news.models import Article, ArticleCategory

# Ancienne adresse (programme à trois jours) : redirigée vers la nouvelle par le front (routes.tsx).
OLD_SLUG = "urban-hub-connect-lancement-11-13-decembre-2026"
SLUG = "urban-hub-connect-lancement-11-12-decembre-2026"
TITLE = "Urban Hub Connect, le réseau des acteurs de Diamniadio et du Lac Rose, sera lancé les 11 et 12 décembre 2026"
OLD_TITLE = "Urban Hub Connect, le réseau des acteurs de Diamniadio et du Lac Rose, sera lancé du 11 au 13 décembre 2026"
PLACEHOLDER = "[à compléter : texte de l'article fourni dans le cahier des charges]"
EXCERPT = ("Institutions, entreprises, investisseurs, écoles, associations, communautés et jeunes talents des pôles urbains "
           "de Diamniadio et du Lac Rose disposent désormais d'un réseau commun : Urban Hub Connect.")
CONTENT = """Institutions, entreprises, investisseurs, écoles, associations, communautés et jeunes talents des pôles urbains de Diamniadio et du Lac Rose disposent désormais d'un réseau commun : Urban Hub Connect. Son ambition : créer un cadre permanent où les acteurs des deux pôles se connaissent, partagent l'information et construisent ensemble des coopérations utiles au territoire.

Le réseau sera officiellement lancé lors de la première édition du Grand Week-End du Pôle, les vendredi 11 et samedi 12 décembre 2026 : ouverture officielle, Forum du Pôle en quatre panels, rendez-vous d'affaires, grand reboisement du Lac Rose, Awards et Gala du Pôle.

Les organisations qui souhaitent devenir membres fondateurs ou partenaires peuvent dès à présent contacter la Coordination au +221 78 309 56 56 ou à infosurbanhubconnect@gmail.com."""


def seed_first_article():
    """Retourne (créé, mis_à_jour)."""
    category = ArticleCategory.objects.get(slug="le-reseau")
    article, created = Article.objects.get_or_create(
        slug=SLUG, defaults={"title": TITLE, "category": category, "excerpt": EXCERPT, "content": CONTENT,
                             "is_published": True, "published_at": timezone.now()})
    updated = 0
    if not created:
        updated = Article.objects.filter(slug=SLUG, content=PLACEHOLDER).update(
            title=TITLE, excerpt=EXCERPT, content=CONTENT, is_published=True, published_at=timezone.now(), updated_at=timezone.now())
    return int(created), updated
