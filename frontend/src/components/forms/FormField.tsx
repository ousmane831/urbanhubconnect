import type { ReactNode } from "react";

export const fieldProps = (id: string, error?: string) =>
  ({ id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-err` : undefined }) as const;

interface Props { id: string; label: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }

export function FormField({ id, label, error, hint, required, children, className = "" }: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label}{required && <span className="text-red-700" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-navy/65">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
