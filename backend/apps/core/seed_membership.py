"""Textes des pages Adhérer et Annuaire (cahier des charges), alignement des libellés, dossiers manquants.
Créé une fois : les modifications faites dans l'admin ne sont jamais écrasées."""
from apps.core.models import PageContent
from apps.memberships.models import MembershipCategory
from apps.memberships.services import backfill_dossiers
from apps.organizations.models import Sector

RENAMES = [
    (Sector, "construction-et-immobilier", "Construction et immobilier", "BTP et immobilier"),
    (Sector, "education-et-formation", "Éducation et formation", "Enseignement et formation"),
    (MembershipCategory, "membre-individuel", "Membre individuel", "Membre individuel (professionnel, expert)"),
]

PAGES = [
    ("espace-membres", "Espace membres", """Accès réservé aux membres à jour de leur cotisation, avec identifiant et mot de passe.

- Mon profil : modifier la fiche Annuaire et le point sur la Cartographie.
- Annuaire complet et demandes de mise en relation.
- Urban Opportunities : publier et consulter partenariats, appels d'offres, sous-traitance, emplois, stages.
- Documents réservés : comptes rendus des commissions, Urban Notes, résultats du Baromètre, documents de l'Assemblée générale."""),
    ("adherer-intro", "Rejoignez le réseau", "Entreprise, institution, école, association, investisseur, professionnel ou étudiant : si vous travaillez, investissez, étudiez ou vivez à Diamniadio ou au Lac Rose, Urban Hub Connect est votre réseau. Les organisations qui adhèrent avant le 11 décembre 2026 ont le statut de membre fondateur et signent la Charte lors de la soirée officielle de lancement."),
    ("adherer-avantages", "Ce que vous apporte l'adhésion", """- Une place dans l'Annuaire et sur la Cartographie du Hub.
- L'accès aux After Work Connect, aux commissions et aux cercles du réseau.
- Les opportunités relayées par Urban Opportunities et La Lettre du Hub.
- Des mises en relation Business Connect sur demande.
- Les avantages de la Carte Privilèges Membres, dès son lancement.
- Une voix à l'Assemblée générale."""),
    ("adherer-etapes", "Adhérer en trois étapes", """1. Remplissez le formulaire en ligne.
2. Recevez le bulletin d'adhésion et la Charte à signer.
3. Réglez votre cotisation : votre fiche est publiée dans l'Annuaire et vous recevez vos accès à l'Espace membres."""),
    ("annuaire-intro", "L'Annuaire des acteurs des deux pôles", "Qui fait quoi à Diamniadio et au Lac Rose ? L'Annuaire Urban Hub Connect réunit les organisations membres du réseau, leurs activités, leurs expertises, ce qu'elles proposent et ce qu'elles recherchent. Un outil simple pour trouver un partenaire, un fournisseur, un prestataire de proximité, un stagiaire ou le bon interlocuteur."),
    ("annuaire-fiche-visible", "Visible par tous", "Nom et logo, collège, secteur, pôle et quartier, présentation en quelques lignes, site internet, réseaux sociaux, emplacement sur la Cartographie."),
    ("annuaire-fiche-reserve", "Réservé aux membres connectés", "Nom, fonction et coordonnées directes du représentant, offres et besoins détaillés, disponibilité pour un rendez-vous Business Connect, stages et recrutements proposés."),
    ("annuaire-regles", "Règles de l'Annuaire", """- Seules les organisations membres, à jour de leur cotisation, figurent dans l'Annuaire complet.
- Chaque organisation rédige et met à jour sa fiche ; la Coordination la valide avant publication.
- Les coordonnées des membres ne peuvent pas être utilisées à des fins de prospection massive ; toute utilisation abusive entraîne la suspension de l'accès.
- Chaque organisation peut modifier ou retirer sa fiche à tout moment."""),
]


def seed_membership_content():
    changed = 0
    for model, slug, old, new in RENAMES:  # n'agit que si le libellé n'a pas déjà été modifié
        changed += model.objects.filter(slug=slug, name=old).update(name=new)
    for slug, title, content in PAGES:
        _, new = PageContent.objects.get_or_create(slug=slug, defaults={"title": title, "content": content, "is_published": True})
        changed += new
    return changed, backfill_dossiers()
