# Guide de la Coordination — administration du site

Adresse : `https://www.urbanhubconnect.com/admin/`

## Démarrage

1. Connectez-vous avec votre compte. Les comptes **Coordination** peuvent consulter, ajouter et modifier le
   contenu ; seuls les **Administrateurs** peuvent supprimer et gérer les comptes.
2. Le tableau de bord liste toutes les rubriques (organisations, lieux de la carte, événements, articles,
   demandes reçues, documents, paramètres du site).
3. **Création d'un compte** (Administrateur) : Utilisateurs → Ajouter, choisir le rôle « Coordination » ou
   « Administrateur ».

## Organisations (Annuaire)

Chaque fiche a **deux statuts distincts** :

- **Validation** : En attente → En cours d'examen → Acceptée ou Refusée.
- **Publication** : Publiée ou Masquée.

Une fiche acceptée n'est **pas** publiée automatiquement. Une fiche non acceptée ne peut jamais être publiée.

Pour valider une demande de référencement reçue par le formulaire :
1. Organisations → filtrer « Validation : En attente », ouvrir la fiche.
2. Vérifier les informations, compléter le collège, le secteur et les commissions si besoin.
3. Dans la liste, cocher la fiche → action **Accepter (sans publier)**, puis, quand tout est prêt,
   **Publier (fiches acceptées uniquement)**.
4. Pour retirer une fiche : action **Dépublier (masquer)**.

La section « 🔒 Informations privées » (représentant, téléphone, e-mail, offres, besoins) n'apparaît jamais
sur le site public. Ajoutez une organisation à la main avec « Ajouter », comme pour une demande reçue.

## Cartographie

- **Catégories de carte** : modifiables (nom, icône, ordre, actif). Désactiver une catégorie masque ses lieux.
- **Lieux de la carte** → Ajouter : nom, catégorie, adresse, latitude/longitude (le lien « OpenStreetMap »
  permet de vérifier). Si le lieu est une organisation membre, choisissez-la : l'adresse, les coordonnées et le
  pôle sont repris automatiquement et un lien vers la fiche s'affiche (si la fiche est publiée).
- **Suggestions de lieu** (reçues du site) : action « Créer un lieu (brouillon masqué) », puis vérifier et publier.

## Événements

Événements → Ajouter : titre, type, dates, lieu, public, image, lien d'inscription, « à la une » (apparaît
sur l'accueil avec le compte à rebours). Cocher **Publié** pour l'afficher. Le Grand Week-End du Pôle 2026 existe
déjà : complétez sa description et son lieu. Le programme détaillé se saisit dans la description.

## Actualités

Articles → Ajouter : titre, catégorie, chapô, contenu, image, auteur. **Publié** + date de publication
(une date future programme la parution). Le premier article est créé en **brouillon** : collez-y le texte
officiel, puis publiez.

## Partenaires et formules

- **Formules de partenariat** et **catégories d'adhésion** : montants modifiables directement dans la liste.
- **Partenaires** → Ajouter : nom, logo, formule. Cocher **Confirmé** pour l'afficher. Tant qu'aucun partenaire
  n'est confirmé, le bloc « Nos partenaires » reste masqué.

## Demandes reçues

Adhésions, partenariats, accréditations presse, candidatures Awards, inscriptions Business Connect, bénévoles,
suggestions de lieu : chaque liste a un badge de statut et des actions groupées (examen, accepter, refuser).
**Messages de contact** : à traiter / traité (une copie est aussi envoyée à l'adresse de contact).
**Newsletter** : abonnés, export CSV (action « Exporter la sélection »).

## Documents et presse

- **Documents** → Ajouter : PDF uniquement, catégorie, cocher **Téléchargeable publiquement**.
  Le dossier de presse (catégorie « Dossier de presse ») apparaît sur la page Presse.
- **Communiqués** : titre, résumé, PDF, publier.

## Paramètres du site

Paramètres du site : téléphone, WhatsApp (format international sans +), e-mail, adresse, réseaux sociaux,
mention de pied de page, **mentions légales** et **politique de confidentialité** (textes à compléter).

## Sauvegardes

- Base de données : `docker compose exec postgres pg_dump -U urbanhub urbanhub > sauvegarde.sql`
  (à planifier chaque jour ; conserver les copies hors du serveur).
- Fichiers téléversés : sauvegarder le volume Docker `media`.
- Restauration : `cat sauvegarde.sql | docker compose exec -T postgres psql -U urbanhub urbanhub`.

## Déploiement et mises à jour

Voir `README.md` (section Production). Mise à jour : récupérer la nouvelle version, puis
`docker compose up -d --build`. Les migrations s'appliquent au démarrage.
