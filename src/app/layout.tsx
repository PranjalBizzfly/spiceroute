import type { Metadata } from "next";
import { Montserrat, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./editorial.css";
import "./chrome.css";
import "./hero.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getEditionYears, getLatestEdition } from "@/lib/content";
import { storyCategories } from "@/lib/search";
import { siteConfig } from "@/data/siteConfig";
import { SITE_URL } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

// Hero sections only: the nearest open match to Gotham, the source site's face
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

const latestCover = getLatestEdition();

export const metadata: Metadata = {
  // Canonical / Open Graph URLs resolve against the production domain
  metadataBase: new URL(SITE_URL),
  title: "Spice Route — The Inflight Magazine of SpiceJet | Published by NKN Media",
  // Verbatim from the spiceroutemagazine.in homepage
  description: siteConfig.description,
  keywords: ["Spice Route", "SpiceRoute", "SpiceJet", "Inflight Magazine", "SpiceJet Magazine", "NKN Media"],
  authors: [{ name: "NKN Media" }],
  icons: {
    icon: "/images/spice-route-logo.png",
  },
  openGraph: {
    title: "Spice Route — The Inflight Magazine of SpiceJet",
    description: siteConfig.description,
    url: "/",
    siteName: "Spice Route Magazine",
    images: [{ url: latestCover.cover, alt: `Cover of ${latestCover.title}` }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spice Route — The Inflight Magazine of SpiceJet",
    description: siteConfig.description,
    images: [latestCover.cover],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const latest = getLatestEdition();

  return (
    // data-theme may be set by the inline script before hydration
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body>
        {/* Saved theme choice, applied before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header
          latestEdition={{
            slug: latest.slug,
            month: latest.month,
            year: latest.year,
            issue: latest.issue,
          }}
          tagline={siteConfig.tagline}
          publisherName={siteConfig.publisher.name}
          storyMenu={storyCategories().map((c) => ({ href: `/search?category=${c.slug}`, label: c.name }))}
          years={getEditionYears()}
        />
        <main id="main-content" style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
