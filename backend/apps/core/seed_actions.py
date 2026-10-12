"""Contenu de la page « Nos actions » repris du cahier des charges. Créé une fois ; les modifications faites dans
l'admin ne sont jamais écrasées (seuls les champs encore vides des commissions sont complétés)."""
from django.utils.text import slugify

from apps.core.models import ActionItem, PageContent
from apps.organizations.models import Commission

COMMISSIONS = {
    "Entreprise et Investissement": ("Implantation d'entreprises, achats locaux, accès aux marchés, chaînes de valeur, PME.", "Rencontres acheteurs–fournisseurs, accueil des investisseurs."),
    "Mobilité et Accessibilité": ("Déplacements domicile–travail, interconnexion des espaces de vie et d'activité.", "Covoiturage interentreprises, navettes mutualisées, signalétique."),
    "Emploi, Talents et Formation": ("Employabilité, besoins des entreprises, formation professionnelle, jeunesse.", "Job dating, stages, forum écoles–entreprises."),
    "Services et Cadre de vie": ("Habitat, services de proximité, maintenance, sécurité, loisirs, espaces communs.", "Guide des services, remontée des besoins des habitants."),
    "Environnement et Durabilité": ("Eau, énergie, espaces verts, gestion des déchets, économie circulaire, résilience.", "Journées citoyennes, tri mutualisé, plantations."),
    "Innovation et Numérique": ("Technologies, données, transformation numérique et solutions adaptées au territoire.", "Challenge Urban Solutions, démonstrations de startups."),
    "Tourisme, Culture et Attractivité": ("Hospitalité, identité territoriale, patrimoine, culture, événements, destination.", "Circuits de découverte, agenda culturel commun."),
    "Inclusion et Communautés": ("Dialogue avec les communautés, égalité des chances, engagement des jeunes et des femmes.", "Citizens Forum, jeunes ambassadeurs, cercle des femmes leaders."),
}

PROGRAMMES = [
    ("Achetons Local", "Des rencontres acheteurs–fournisseurs où les grands donneurs d'ordre publics et privés présentent leurs besoins et où les PME des deux pôles présentent leurs offres. Une Charte Entreprise–Territoire invite les membres à s'engager volontairement : achats locaux, recrutement local, accueil de stagiaires.", ""),
    ("Mentorat du Hub", "Des dirigeants expérimentés accompagnent bénévolement de jeunes entrepreneurs du territoire pendant douze mois : rencontres régulières, ouverture de leur carnet d'adresses, conseils pour décrocher de premiers marchés.", ""),
    ("Talents du Pôle", "Job dating, forum écoles–entreprises, « Une journée en entreprise » pour les étudiants et banque de stages partagée : un pont direct entre les établissements de formation et les employeurs des deux pôles.", ""),
    ("Pack Bienvenue", "Un accueil structuré des nouveaux arrivants – entreprises qui s'installent, agents qui rejoignent le pôle, familles qui emménagent : un guide pratique des services, un parrain membre du réseau et une présentation à la communauté lors du prochain After Work.", ""),
    ("Portes ouvertes et learning expeditions", "Visites de sites, d'entreprises, d'établissements et de sites de production des deux pôles, accueil de délégations et d'investisseurs, missions d'étude dans d'autres villes nouvelles d'Afrique.", ""),
    ("Diaspora Connect", "Relier la diaspora sénégalaise aux opportunités des deux pôles : investissement, compétences, création d'entreprise, retour au pays. Sessions en ligne et rencontres pendant les périodes de retour.", ""),
    ("Pôle Propre et Vert", "Journées citoyennes de nettoyage et de plantation, défis écologiques entre entreprises, collecte et tri mutualisés, covoiturage entre salariés.", ""),
    ("Challenge Urban Solutions", "Chaque année, une institution ou une entreprise pose un vrai problème du territoire ; startups, étudiants et PME proposent leurs solutions ; les lauréats sont accompagnés pour tester leur projet sur le terrain.", ""),
]
CERCLES = [
    ("Club RH et Talents", "Responsables des ressources humaines : recrutement local, formation, bien-être des salariés.", ""),
    ("Club RSE et Impact", "Responsables RSE et fondations : projets communautaires et environnementaux communs.", ""),
    ("Club Services généraux", "Office managers et services généraux : achats groupés, prestataires locaux, sécurité, restauration.", ""),
    ("Cercle Elles Connect", "Femmes dirigeantes, entrepreneures et cadres : leadership, visibilité et accès aux marchés.", ""),
    ("Jeunes Ambassadeurs", "Étudiants et jeunes talents volontaires qui relaient le réseau dans les campus et les quartiers.", ""),
    ("Cercle des Investisseurs", "Investisseurs et promoteurs : veille, projets à fort potentiel et co-investissements.", ""),
]
OUTILS = [
    ("Annuaire Urban Hub Connect", "Les membres, leurs activités, expertises, offres et besoins.", "/annuaire"),
    ("Cartographie du Hub", "Les entreprises, institutions, compétences, services, équipements et initiatives des deux pôles.", "/cartographie"),
    ("Urban Opportunities", "Partenariats, appels à projets, sous-traitance, recherche de fournisseurs, emplois, formations et investissements.", ""),
    ("Business Connect", "Des mises en relation qualifiées et sur demande entre membres.", ""),
    ("Baromètre Urban Hub Connect", "Une enquête périodique sur les perceptions, priorités, besoins et opportunités exprimés par les membres.", ""),
    ("Urban Notes", "Les principaux enseignements des rencontres, commissions et travaux du réseau.", ""),
    ("Appel à solutions", "Des problèmes concrets du territoire soumis aux entreprises, experts et startups capables d'y répondre.", ""),
    ("La Lettre du Hub", "Une lettre d'information mensuelle : agenda, nouveaux membres, opportunités, portraits d'acteurs.", "/actualites#lettre-du-hub"),
    ("Carte Privilèges Membres", "Des avantages offerts par les membres commerçants et prestataires aux salariés des autres membres.", ""),
    ("Maison du Hub", "À terme, un lieu permanent pour se rencontrer, s'informer, travailler ensemble et animer la communauté.", ""),
]
PAGES = [
    ("nos-actions-commissions", "Huit dynamiques, huit commissions", "Chaque grande priorité du territoire est portée par une commission permanente de membres volontaires. Les commissions partagent les bonnes pratiques, identifient les problèmes communs, rapprochent les expertises et font émerger des propositions et des projets."),
    ("nos-actions-commissions-fin", "Conclusion des commissions", "Le réseau crée la rencontre. Les commissions construisent la continuité."),
    ("nos-actions-programmes", "Passer de la rencontre à l'action", ""),
    ("nos-actions-cercles", "Les cercles du réseau", "Des groupes restreints de pairs qui se retrouvent régulièrement pour échanger sur leur métier, partager des solutions et monter des actions communes."),
    ("nos-actions-outils", "Les outils du réseau", "Au-delà des rencontres, Urban Hub Connect met à disposition de ses membres des outils qui entretiennent la connexion, font circuler les opportunités et renforcent la connaissance de l'écosystème."),
]


def seed_actions():
    """Retourne le nombre d'éléments créés ou complétés (0 au second passage)."""
    changed = 0
    for name, (description, actions) in COMMISSIONS.items():
        slug = slugify(name)
        changed += Commission.objects.filter(slug=slug, description="").update(description=description)
        changed += Commission.objects.filter(slug=slug, actions="").update(actions=actions)
    for kind, rows in (("programme", PROGRAMMES), ("cercle", CERCLES), ("outil", OUTILS)):
        for order, (name, description, link) in enumerate(rows, start=1):
            _, new = ActionItem.objects.get_or_create(slug=slugify(name), defaults={
                "name": name, "kind": kind, "description": description, "link": link, "display_order": order})
            changed += new
    for slug, title, content in PAGES:
        _, new = PageContent.objects.get_or_create(slug=slug, defaults={"title": title, "content": content, "is_published": True})
        changed += new
    return changed
