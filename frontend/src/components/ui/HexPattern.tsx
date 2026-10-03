/** Motif hexagonal discret de l'identité du réseau (décoratif, masqué aux lecteurs d'écran). */
export function HexPattern({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id="hex" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(1.1)">
          <path d="M28 0 56 16v32L28 64 0 48V16zM28 64v33M0 48 0 81 28 97M56 48v33L28 97" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  );
}
