import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/data/siteConfig";
import { getEditions, getEditionYears, getLatestEdition } from "@/lib/content";
import { storyCategories } from "@/lib/search";
import { categoryHref } from "@/lib/urls";

// Story categories listed under Explore (the recurring columns — Welcome
// Aboard, Predictions — are reached from their editions instead)
const EXPLORE_CATEGORIES = ["travel", "destinations", "cuisine", "culture", "wellness", "interviews", "wildlife"];

// Brand glyphs for the round social buttons (24 × 24, drawn in currentColor)
const ICONS: Record<string, React.ReactNode> = {
  x: <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.25 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />,
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5Z" />,
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </g>
  ),
  linkedin: (
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.79 2.66 4.79 6.12V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4V9.5Z" />
  ),
  whatsapp: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </g>
  ),
};

// Social profiles linked from the source site's header and footer
const SOCIALS = [
  { href: siteConfig.contact.socials.facebook, label: "Facebook", icon: "facebook" },
  { href: siteConfig.contact.socials.instagram, label: "Instagram", icon: "instagram" },
  { href: siteConfig.contact.socials.linkedin, label: "LinkedIn", icon: "linkedin" },
  { href: siteConfig.contact.socials.twitter, label: "X (Twitter)", icon: "x" },
  { href: siteConfig.contact.whatsappUrl, label: "WhatsApp", icon: "whatsapp" },
];

const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

/**
 * Site footer, laid out after pickyassist.com: a dark band with a hanging
 * tagline tab, a brand column, ruled link columns and pill CTAs. Every line
 * is taken from the source site or derived from the verified edition data —
 * no taglines or claims of its own.
 */
export default function Footer() {
  const latest = getLatestEdition();
  const total = getEditions().length;
  const years = getEditionYears();
  const explore = storyCategories().filter((c) => EXPLORE_CATEGORIES.includes(c.slug));

  return (
    <footer className="ed-pfoot">
      <p className="ed-pfoot__tab">{siteConfig.tagline}</p>

      <div className="container">
        <div className="ed-pfoot__grid">
          {/* SPICE ROUTE */}
          <section className="ed-pfoot__brand" aria-labelledby="footer-brand">
            <h2 id="footer-brand" className="visually-hidden">
              Spice Route
            </h2>
            <Link href="/" className="ed-pfoot__logo" aria-label="Spice Route — home">
              <Image
                src="/images/spice-route-logo.webp"
                alt="Spice Route — The Inflight Magazine of SpiceJet"
                fill
                sizes="200px"
                style={{ objectFit: "contain", objectPosition: "left center" }}
              />
            </Link>
            <p className="ed-pfoot__text">{siteConfig.description}</p>

            <ul className="ed-pfoot__social" aria-label="Social media">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
                      {ICONS[s.icon]}
                    </svg>
                    <span className="visually-hidden">
                      {s.label} (opens in a new tab)
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            {/* Publisher card, set like the partner badges on the reference */}
            <Link href="/about#nkn-title" className="ed-pfoot__badge">
              <span className="ed-pfoot__badgelabel">A Publication by</span>
              <Image
                src="/images/hero/nkn-media-logo.webp"
                alt={siteConfig.publisher.name}
                width={469}
                height={328}
                sizes="64px"
                className="ed-pfoot__badgelogo"
              />
            </Link>
          </section>

          {/* EXPLORE */}
          <nav className="ed-pfoot__col" aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="ed-pfoot__head">
              Explore
            </h2>
            <ul className="ed-pfoot__list">
              {explore.map((c) => (
                <li key={c.slug}>
                  <Link href={categoryHref(c.id)}>{c.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/search">All stories</Link>
              </li>
            </ul>
          </nav>

          {/* MAGAZINE */}
          <nav className="ed-pfoot__col" aria-labelledby="footer-magazine">
            <h2 id="footer-magazine" className="ed-pfoot__head">
              Magazine
            </h2>
            <ul className="ed-pfoot__list">
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
          <nav className="ed-pfoot__col" aria-labelledby="footer-about">
            <h2 id="footer-about" className="ed-pfoot__head">
              About
            </h2>
            <ul className="ed-pfoot__list">
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
          <section className="ed-pfoot__col ed-pfoot__connect" aria-labelledby="footer-connect">
            <h2 id="footer-connect" className="ed-pfoot__head">
              Connect
            </h2>
            <ul className="ed-pfoot__list">
              <li>
                <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
              </li>
              <li>
                <a href={tel(siteConfig.contact.phoneDubai)}>{siteConfig.contact.phoneDubai}</a>
              </li>
              <li>
                <a href={tel(siteConfig.contact.phoneIndia)}>{siteConfig.contact.phoneIndia}</a>
              </li>
            </ul>
            <address className="ed-pfoot__address">{siteConfig.contact.address}</address>

            <div className="ed-pfoot__ctas">
              <Link href={`/inflight-magazine/${latest.slug}`} className="ed-pfoot__pill ed-pfoot__pill--dark">
                Read {latest.month} {latest.year}
                <span className="ed-pfoot__pillarrow" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
              <Link href="/contact" className="ed-pfoot__pill ed-pfoot__pill--bright">
                Advertise With Us
              </Link>
            </div>
          </section>
        </div>

        {/* Source footer line */}
        <div className="ed-pfoot__base">
          <p>&copy; {new Date().getFullYear()} NKN Beyond Marketing. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
