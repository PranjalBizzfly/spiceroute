import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/data/siteConfig";
import { getEditions, getEditionYears, getLatestEdition } from "@/lib/content";
import { storyCategories } from "@/lib/search";

// Story categories listed under Explore (the recurring columns — Welcome
// Aboard, Predictions — are reached from their editions instead)
const EXPLORE_CATEGORIES = ["travel", "destinations", "cuisine", "culture", "wellness", "interviews", "wildlife"];

// Social profiles linked from the source site's header and footer
const SOCIALS = [
  { href: siteConfig.contact.socials.twitter, label: "X (Twitter)" },
  { href: siteConfig.contact.socials.facebook, label: "Facebook" },
  { href: siteConfig.contact.socials.instagram, label: "Instagram" },
  { href: siteConfig.contact.socials.linkedin, label: "LinkedIn" },
  { href: siteConfig.contact.whatsappUrl, label: "WhatsApp" },
];

/**
 * Site footer. Every line here is taken from the source site or derived from
 * the verified edition data — no taglines or claims of its own.
 */
export default function Footer() {
  const latest = getLatestEdition();
  const total = getEditions().length;
  const years = getEditionYears();
  const explore = storyCategories().filter((c) => EXPLORE_CATEGORIES.includes(c.slug));

  return (
    <footer className="ed-footer">
      <div className="container">
        <div className="ed-footer__grid">
          {/* SPICE ROUTE */}
          <section className="ed-footer__brand" aria-labelledby="footer-brand">
            <h2 id="footer-brand" className="visually-hidden">
              Spice Route
            </h2>
            <Link href="/" className="ed-footer__logo" aria-label="Spice Route — home">
              <Image
                src="/images/spice-route-logo.webp"
                alt=""
                fill
                sizes="180px"
                style={{ objectFit: "contain", objectPosition: "left center" }}
              />
            </Link>
            <p className="ed-footer__tagline">{siteConfig.tagline}</p>
            <p className="ed-footer__text">{siteConfig.description}</p>
            <p className="ed-footer__text">A Publication by {siteConfig.publisher.name}</p>
          </section>

          <div className="ed-footer__cols ed-footer__cols--4">
            {/* EXPLORE */}
            <nav className="ed-footer__col" aria-labelledby="footer-explore">
              <h2 id="footer-explore" className="ed-footer__head">
                Explore
              </h2>
              <ul className="ed-footer__list">
                {explore.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/search?category=${c.slug}`}>{c.name}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/search">All stories</Link>
                </li>
              </ul>
            </nav>

            {/* MAGAZINE */}
            <nav className="ed-footer__col" aria-labelledby="footer-magazine">
              <h2 id="footer-magazine" className="ed-footer__head">
                Magazine
              </h2>
              <ul className="ed-footer__list">
                <li>
                  <Link href={`/inflight-magazine/${latest.slug}`}>
                    Latest issue · {latest.month} {latest.year}
                  </Link>
                </li>
                {years.map((y) => (
                  <li key={y}>
                    <Link href={`/inflight-magazine#year-${y}`}>{y} editions</Link>
                  </li>
                ))}
                <li>
                  <Link href="/inflight-magazine">All {total} editions</Link>
                </li>
              </ul>
            </nav>

            {/* ABOUT */}
            <nav className="ed-footer__col" aria-labelledby="footer-about">
              <h2 id="footer-about" className="ed-footer__head">
                About
              </h2>
              <ul className="ed-footer__list">
                <li>
                  <Link href="/about">About Spice Route</Link>
                </li>
                <li>
                  <Link href="/about#nkn-title">NKN Media</Link>
                </li>
                <li>
                  <Link href="/about#advertise-title">Advertising</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
                <li>
                  <a href={siteConfig.spiceJet.mediaKitUrl} target="_blank" rel="noopener noreferrer">
                    Media Kit 2025–26 (PDF)
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </li>
              </ul>
            </nav>

            {/* CONNECT */}
            <section className="ed-footer__col ed-footer__connect" aria-labelledby="footer-connect">
              <h2 id="footer-connect" className="ed-footer__head">
                Connect
              </h2>
              <ul className="ed-footer__list">
                <li>
                  <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
                </li>
                <li>
                  <a href={`tel:${siteConfig.contact.phoneDubai.replace(/\s/g, "")}`}>{siteConfig.contact.phoneDubai}</a>
                </li>
                <li>
                  <a href={`tel:${siteConfig.contact.phoneIndia.replace(/\s/g, "")}`}>{siteConfig.contact.phoneIndia}</a>
                </li>
              </ul>
              <address className="ed-footer__address">{siteConfig.contact.address}</address>
              <ul className="ed-footer__social" aria-label="Social media">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Source footer line */}
        <div className="ed-footer__base">
          <p>&copy; {new Date().getFullYear()} NKN Beyond Marketing. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
