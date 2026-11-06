import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

/** Version officielle pour fond sombre (« URBAN HUB » blanc, « CONNECT » vert clair), fichier fourni par la Coordination :
 *  frontend/public/logo_dark_bg.png. Tant qu'il manque, on revient au logo d'origine sur cartouche blanc (ancienne règle). */
const DARK_LOGO = "/logo_dark_bg.png";

export function LogoImage({ onDark = false, className = "h-12" }: { onDark?: boolean; className?: string }) {
  const [missing, setMissing] = useState(false);
  if (onDark && !missing)
    return <img src={DARK_LOGO} alt="Urban Hub Connect" onError={() => setMissing(true)} className={`${className} w-auto object-contain`} />;
  return (
    <span className={onDark ? "inline-flex rounded-md bg-white px-2 py-1" : "inline-flex"}>
      <img src={logo} alt="Urban Hub Connect" className={`${className} w-auto object-contain`} />
    </span>
  );
}

export const Logo = ({ onDark = false }: { onDark?: boolean }) => (
  <Link to="/" aria-label="Urban Hub Connect, accueil" className="flex items-center">
    <LogoImage onDark={onDark} />
  </Link>
);
