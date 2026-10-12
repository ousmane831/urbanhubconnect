# Guide du Mode Maintenance

## Vue d'ensemble

Le mode maintenance permet de masquer le site public avec une page stylisée "Site en construction" tout en permettant à l'équipe d'accéder au site avec un mot de passe.

## Fonctionnalités

- **Page de maintenance stylisée** : Design moderne avec dégradé bleu/indigo
- **Authentification par mot de passe** : Accès réservé à l'équipe
- **Bouton de déconnexion** : Visible uniquement pour les utilisateurs authentifiés
- **Configuration facile** : Mot de passe et messages personnalisables

## Comment activer le mode maintenance

### Étape 1 : Modifier le mot de passe (optionnel)

Ouvrez le fichier `frontend/src/config/maintenance.ts` et modifiez le mot de passe :

```typescript
export const MAINTENANCE_CONFIG = {
  PASSWORD: "votre-nouveau-mot-de-passe",
  MESSAGE: "Votre message personnalisé",
  CONTACT_EMAIL: "contact@urbanhubconnect.com",
};
```

### Étape 2 : Activer le mode maintenance

Ouvrez le fichier `frontend/src/components/MaintenanceGuard.tsx` et changez la constante :

```typescript
// Changez cette variable à true pour activer la page de maintenance
const MAINTENANCE_MODE = true;  // ← Changez false à true
```

### Étape 3 : Redéployer l'application

Après avoir activé le mode maintenance, redéployez votre application :

```bash
# Si vous utilisez Docker
docker-compose down
docker-compose up -d --build

# Ou selon votre processus de déploiement
```

## Comment accéder au site en mode maintenance

1. Allez sur `urbanhubconnect.com`
2. Vous verrez la page de maintenance
3. Entrez le mot de passe configuré
4. Vous serez redirigé vers le site complet

## Comment désactiver le mode maintenance

1. Ouvrez `frontend/src/components/MaintenanceGuard.tsx`
2. Changez `MAINTENANCE_MODE` à `false`
3. Redéployez l'application

## Comment se déconnecter

Une fois connecté, un bouton "Quitter maintenance" apparaît dans le header (en haut à droite) :
- Sur desktop : Icône de déconnexion + texte
- Sur mobile : Dans le menu hamburger

## Sécurité

⚠️ **Important** : Le système d'authentification actuel utilise localStorage et un mot de passe en clair. C'est suffisant pour un usage temporaire, mais pour une sécurité renforcée, envisagez :

- Utiliser des variables d'environnement pour le mot de passe
- Implémenter une authentification backend plus robuste
- Ajouter une expiration de session
- Utiliser HTTPS (déjà recommandé en production)

## Fichiers modifiés

- `frontend/src/pages/Maintenance.tsx` : Page de maintenance
- `frontend/src/hooks/useMaintenanceAuth.tsx` : Hook d'authentification
- `frontend/src/components/MaintenanceGuard.tsx` : Composant de protection
- `frontend/src/config/maintenance.ts` : Configuration
- `frontend/src/routes.tsx` : Intégration des routes
- `frontend/src/components/layout/Header.tsx` : Bouton de déconnexion

## Support

Pour toute question ou problème, contactez l'équipe technique.
