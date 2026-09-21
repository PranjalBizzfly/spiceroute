import Image from "next/image";
import { siteConfig } from "@/data/siteConfig";

interface PartnerLogosProps {
  /** Rendered inside a page that already provides its own section frame. */
  bare?: boolean;
}

/** Partner logos as shown on the source About page, with its own sentence. */
export default function PartnerLogos({ bare = false }: PartnerLogosProps) {
  const logos = (
    <ul className="ed-logos" aria-label="Media partners">
      {siteConfig.partners.map((partner) => (
        <li key={partner.name} className="ed-logo partner-logo-item">
          <Image
            src={partner.logo}
            alt={partner.name}
            fill
            sizes="108px"
            loading="lazy"
            style={{ objectFit: "contain" }}
          />
        </li>
      ))}
    </ul>
  );

  if (bare) return logos;

  return (
    <section className="ed-section ed-section--tight ed-section--rule ed-partners" aria-labelledby="partners-title">
      <div className="container ed-partners__grid">
        <div className="ed-partners__intro">
          <h2 id="partners-title" className="ed-kicker">
            Media partnerships
          </h2>
          <p className="ed-partners__text">{siteConfig.publisher.partnerships}</p>
        </div>
        {logos}
      </div>
    </section>
  );
}
