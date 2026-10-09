import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

export const Logo = () => (
  <Link
    to="/"
    aria-label="Urban Hub Connect, accueil"
    className="flex items-center"
  >
    <img
      src={logo}
      alt="Urban Hub Connect"
      className="h-12 w-auto object-contain"
    />
  </Link>
);