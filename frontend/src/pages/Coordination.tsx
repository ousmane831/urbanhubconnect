import { useEffect } from "react";
import { CoordinationApp } from "../features/coordination/CoordinationApp";
import { useSeo } from "../hooks/useSeo";

export default function Coordination() {
  useSeo("Espace Coordination", "Espace réservé à la Coordination.", "/coordination");
  useEffect(() => {  // page privée : non indexée
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
  return <CoordinationApp />;
}
