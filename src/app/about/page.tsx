import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/data/siteConfig";
import PartnerLogos from "@/components/PartnerLogos";
import Reveal from "@/components/Reveal";
import { getLatestEdition } from "@/lib/content";

const title = "About Spice Route & NKN Media | The Inflight Magazine of SpiceJet";
const description =
  "Spice Route, the in-flight magazine of SpiceJet, marking 17 years of consistent readership, and its publisher NKN Media.";
const latest = getLatestEdition();

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title,
  description,
  openGraph: {
    type: "website",
    url: "/about",
    title: "About Spice Route",
    description,
    siteName: "Spice Route Magazine",
    images: [{ url: latest.cover, alt: `Cover of ${latest.title}` }],
  },
  twitter: { card: "summary_large_image", title: "About Spice Route", description, images: [latest.cover] },
};

/*
 * Copy is verbatim from the source site, kept in siteConfig: the About page
 * ("Who Are We?", "About NKN Media", "CEO's Note") and the homepage (the four
 * pillars and the advertising band).
 */
export default function AboutPage() {
  const { ceo } = siteConfig.publisher;

  return (
    <div className="ed-page">
      {/* Hero recreated from the source About page: a full-bleed photograph
          of a SpiceJet aircraft above the clouds, cut by a slanted edge */}
      <section className="ed-shero ed-shero--about">
        <Image
          src="/images/hero/about-hero-plane.webp"
          alt="A SpiceJet Boeing 737 flying above the clouds at sunset"
          fill
          priority
          sizes="100vw"
          className="ed-shero__bg"
        />
        <svg className="ed-shero__shape" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0,100V94L1000,0V100Z" />
        </svg>
      </section>

      <section className="ed-issue__hero" aria-labelledby="about-title">
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li aria-current="page">About</li>
            </ol>
          </nav>

          <div className="ed-page__head">
            <p className="ed-kicker ed-rise">About</p>
            <h1 id="about-title" className="ed-issue__title ed-rise" style={{ "--rise-delay": 40 } as React.CSSProperties}>
              <span className="ed-issue__masthead">Spice Route</span>
              Who Are We?
            </h1>
          </div>

          <div className="ed-about">
            <div className="ed-about__main">
              <p className="ed-about__lede">{siteConfig.spiceRoute.about[0]}</p>
              <div className="ed-prose">
                <p>{siteConfig.spiceRoute.about[1]}</p>
                <p>{siteConfig.spiceJet.overview}</p>
              </div>
            </div>

            {/* Verbatim; written in the third person, so not set as a quote */}
            <section className="ed-about__note" aria-labelledby="ceo-title">
              <h2 id="ceo-title" className="ed-kicker ed-kicker--red">CEO&apos;s Note</h2>
              {ceo.note.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="ed-about__notetext">
                  {paragraph}
                </p>
              ))}
              <div className="ed-byline">
                <p className="ed-byline__name">{ceo.name}</p>
                <p className="ed-byline__role">{ceo.role}</p>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="ed-section ed-section--tint" aria-labelledby="nkn-title">
        <div className="container">
          <div className="ed-about">
            <Reveal className="ed-about__main">
              <p className="ed-kicker">The publisher</p>
              <h2 id="nkn-title" className="ed-shead__title">About NKN Media</h2>
              <div className="ed-prose ed-page__prose">
                {siteConfig.publisher.about.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={90}>
              <ol className="ed-pillars ed-pillars--stack" aria-label="Spice Route and SpiceJet">
                {siteConfig.pillars.map((pillar, i) => (
                  <li key={pillar.title} className="ed-pillar">
                    <p className="ed-pillar__num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="ed-pillar__title">{pillar.title}</h3>
                    <p className="ed-pillar__text">{pillar.description}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      <PartnerLogos />

      {/* Source homepage advertising band */}
      <section className="ed-advert" aria-labelledby="advertise-title">
        <div className="container">
          <Reveal>
            <div className="ed-advert__grid">
              <div>
                <p className="ed-kicker">Advertising</p>
                <h2 id="advertise-title" className="ed-advert__title">
                  Want to get your brand noticed? <em>Let&apos;s work together.</em>
                </h2>
              </div>
              <div className="ed-advert__side">
                <p className="ed-advert__text">{siteConfig.spiceRoute.advertisingNote}</p>
                <div className="ed-actions">
                  <Link href="/contact" className="btn btn-primary">
                    Contact Us <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <a
                    href={siteConfig.spiceJet.mediaKitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    Media Kit 2025–26 (PDF) <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
