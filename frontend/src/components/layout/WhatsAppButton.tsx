import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "../../hooks/useSiteSettings";

const MESSAGE = "Bonjour Urban Hub Connect, je souhaite obtenir des informations sur le réseau.";

export function WhatsAppButton() {
  const { whatsapp } = useSiteSettings();
  return (
    <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(MESSAGE)}`} target="_blank" rel="noopener noreferrer"
      aria-label="Écrire à Urban Hub Connect sur WhatsApp (nouvel onglet)"
      className="fixed bottom-4 right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-green px-3.5 text-white shadow-soft ring-2 ring-white hover:bg-green-2 sm:px-5">
      <MessageCircle className="h-6 w-6" aria-hidden />
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}
