import React from "react";
import { Navigate } from "react-router-dom";
import { useMaintenanceAuth } from "../hooks/useMaintenanceAuth";

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useMaintenanceAuth();

  // Mode maintenance : désactivé pour l'instant
  // Changez cette variable à true pour activer la page de maintenance
  const MAINTENANCE_MODE = true;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (MAINTENANCE_MODE && !isAuthenticated) {
    return <Navigate to="/maintenance" replace />;
  }

  return <>{children}</>;
};
