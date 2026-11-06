import { LogoImage } from "../../components/layout/Logo";
import { Container } from "../../components/ui/Container";
import { useAsync } from "../../hooks/useAsync";
import { getPartnerBand } from "../../services/api";
import type { BandPartner } from "../../types/api";

/** Bandeau « En partenariat avec » (page de l'événement et pied de la page Partenaires).
 *  Ordre et tuile noire réglés dans l'admin (Partenaires › position dans le bandeau). Le premier logo (DGPU) est plus grand
 *  que les suivants, et tous restent plus petits que le logo du réseau. */
function PartnerLogo({ p }: { p: BandPartner }) {
  const img = <img src={p.logo} alt={p.name} loading="lazy" className={`${p.band_order === 1 ? "h-12 sm:h-14" : "h-9 sm:h-10"} w-auto max-w-[11rem] object-contain`} />;
  const tile = p.dark_tile ? <span className="inline-flex rounded-xl bg-black px-4 py-3">{img}</span> : img;
  return p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} (nouvel onglet)`}>{tile}</a> : tile;
}

export function PartnerBand() {
  const band = useAsync(getPartnerBand);
  return (
    <section aria-labelledby="en-partenariat" className="border-t border-navy/10 bg-white py-10">
      <Container className="flex flex-col items-center gap-6 text-center">
        <LogoImage className="h-16 sm:h-20" />
        <p className="max-w-2xl text-lg text-navy/85">Le réseau Urban Hub Connect organise le Grand Week-End du Pôle avec l'appui de la DGPU.</p>
        {!!band.data?.length && (<>
          <h2 id="en-partenariat" className="text-sm font-semibold uppercase tracking-wider text-navy/65">En partenariat avec</h2>
          <ul className="flex flex-wrap items-center justify-center gap-8">
            {band.data.map((p) => <li key={p.name}><PartnerLogo p={p} /></li>)}
          </ul>
        </>)}
        {!band.data?.length && <h2 id="en-partenariat" className="sr-only">En partenariat avec</h2>}
      </Container>
    </section>
  );
}
