import type { UseFormRegister } from "react-hook-form";

/** Champ piège anti-spam : invisible et hors tabulation, seuls les robots le remplissent. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Honeypot({ register }: { register: UseFormRegister<any> }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>Ne pas remplir<input tabIndex={-1} autoComplete="off" {...register("company_website")} /></label>
    </div>
  );
}
