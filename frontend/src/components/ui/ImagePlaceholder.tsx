import { ImageIcon } from "lucide-react";

/** Emplacement d'image clairement identifié, à remplacer par une vraie photo fournie par le réseau. */
export const ImagePlaceholder = ({ label, className = "" }: { label: string; className?: string }) => (
  <div role="img" aria-label={`Emplacement d'image : ${label}`}
    className={`flex flex-col items-center justify-center gap-2 border border-dashed border-navy/25 bg-offwhite text-navy/60 ${className}`}>
    <ImageIcon className="h-8 w-8" aria-hidden />
    <span className="px-4 text-center text-sm">Image à fournir : {label}</span>
  </div>
);
