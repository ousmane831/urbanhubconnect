import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { MAINTENANCE_CONFIG } from "../config/maintenance";
import { Construction, Lock } from "lucide-react";

const Maintenance: React.FC = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === MAINTENANCE_CONFIG.PASSWORD) {
      localStorage.setItem("maintenance-auth", "true");
      navigate("/");
    } else {
      setError("Mot de passe incorrect");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero section avec le même style que le site */}
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-16 sm:py-24 text-center">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => setShowForm(!showForm)}
              className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-green text-white transition-all hover:scale-110 hover:bg-green/90 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
              title="Cliquez pour accéder au site"
            >
              <Construction className="h-10 w-10" />
            </button>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl">Site en construction</h1>
            <p className="mt-5 text-xl text-white/85">
              {MAINTENANCE_CONFIG.MESSAGE}
              <br />
              Revenez bientôt pour découvrir toutes nos nouveautés !
            </p>
          </div>
        </Container>
      </section>

      {/* Formulaire d'accès - affiché uniquement si cliqué */}
      {showForm && (
        <section className="py-16">
          <Container className="max-w-md">
            <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green opacity-10" />
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-navy">Accès réservé</h2>
                </div>
                <p className="mb-6 text-navy/75">
                  Cet espace est réservé aux membres de l'équipe. Entrez le mot de passe pour accéder au site.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-navy">
                      Mot de passe
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Entrez le mot de passe"
                      className="field"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1">
                      Accéder au site
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Informations de contact */}
      <section className="bg-offwhite py-12">
        <Container className="max-w-md text-center">
          <p className="text-navy/75">
            Pour toute question, contactez-nous à :
          </p>
          <a 
            href={`mailto:${MAINTENANCE_CONFIG.CONTACT_EMAIL}`} 
            className="link mt-2 inline-block"
          >
            {MAINTENANCE_CONFIG.CONTACT_EMAIL}
          </a>
        </Container>
      </section>

      {/* Footer */}
      <footer className="bg-navy py-8 text-center text-white/60">
        <Container>
          <p className="text-sm">© 2026 Urban Hub Connect</p>
        </Container>
      </footer>
    </div>
  );
};

export default Maintenance;
