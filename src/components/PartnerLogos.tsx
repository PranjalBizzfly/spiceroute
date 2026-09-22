import LogoMarquee from "./LogoMarquee";
import { siteConfig } from "@/data/siteConfig";

// Alt text reads the logo as printed where it says more than the partner name
const LOGO_TEXT: Record<string, string> = {
  NDTV: "NDTV 24x7",
  "India Today": "India Today Television",
  "PTC Network": "PTC Punjabi",
  Ultimate: "The Ultimate Realty Awards",
};

interface PartnerLogosProps {
  /** Rendered inside a page that already provides its own section frame. */
  bare?: boolean;
}

/** Partner logos as shown on the source About page, with its own sentence. */
export default function PartnerLogos({ bare = false }: PartnerLogosProps) {
  const logos = (
    <LogoMarquee
      label="Media partners"
      logos={siteConfig.partners.map((partner) => ({
        name: partner.name,
        src: partner.logo,
        alt: `${LOGO_TEXT[partner.name] ?? partner.name} logo`,
      }))}
    />
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
