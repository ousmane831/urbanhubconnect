import { useState, useEffect } from "react";

export const useMaintenanceAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authStatus = localStorage.getItem("maintenance-auth");
    setIsAuthenticated(authStatus === "true");
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("maintenance-auth");
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  return { isAuthenticated, isLoading, logout };
};
