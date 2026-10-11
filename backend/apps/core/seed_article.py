"""Premier article du cahier des charges. Créé publié ; un ancien brouillon « [à compléter] » est remplacé,
mais un article déjà modifié dans l'admin n'est jamais écrasé."""
from django.utils import timezone

from apps.news.models import Article, ArticleCategory

SLUG = "urban-hub-connect-lancement-11-13-decembre-2026"
TITLE = "Urban Hub Connect, le réseau des acteurs de Diamniadio et du Lac Rose, sera lancé du 11 au 13 décembre 2026"
PLACEHOLDER = "[à compléter : texte de l'article fourni dans le cahier des charges]"
EXCERPT = ("Institutions, entreprises, investisseurs, écoles, associations, communautés et jeunes talents des pôles urbains "
           "de Diamniadio et du Lac Rose disposent désormais d'un réseau commun : Urban Hub Connect.")
CONTENT = """Institutions, entreprises, investisseurs, écoles, associations, communautés et jeunes talents des pôles urbains de Diamniadio et du Lac Rose disposent désormais d'un réseau commun : Urban Hub Connect. Son ambition : créer un cadre permanent où les acteurs des deux pôles se connaissent, partagent l'information et construisent ensemble des coopérations utiles au territoire.

Le réseau sera officiellement lancé lors de la première édition du Grand Week-End du Pôle, du vendredi 11 au dimanche 13 décembre 2026 : Rencontre des décideurs, Forum du Pôle, rendez-vous d'affaires, Portes Ouvertes, Gala des Awards du Pôle et plantation de 1 000 arbres au Lac Rose.

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
