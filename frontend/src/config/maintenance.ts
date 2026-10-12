/**
 * Configuration du mode maintenance
 * 
 * Pour activer le mode maintenance :
 * 1. Changez MAINTENANCE_MODE à true dans MaintenanceGuard.tsx
 * 2. Modifiez le mot de passe ci-dessous
 * 3. Redéployez l'application
 */

export const MAINTENANCE_CONFIG = {
  // Mot de passe pour accéder au site en mode maintenance
  // Changez ce mot de passe régulièrement pour plus de sécurité
  PASSWORD: "Mma@2026",
  
  // Message personnalisé pour la page de maintenance
  MESSAGE: "Nous travaillons activement pour vous offrir une expérience exceptionnelle.",
  
  // Email de contact affiché sur la page de maintenance
  CONTACT_EMAIL: "contact@urbanhubconnect.com",
};
