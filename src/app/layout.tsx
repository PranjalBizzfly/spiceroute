import type { Metadata } from "next";
import { Montserrat, Newsreader, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./editorial.css";
import "./chrome.css";
import "./hero.css";
import "./footer.css";
import "./home.css";
import "./reading.css";
import "./article.css";
import "./pages.css";
import "./slide.css";
// Type scale: loaded last, the one place font sizes are set
import "./typography.css";
// Motion last: it only adds transitions and never changes layout
import "./motion.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import MotionProvider, { type StoryPreview } from "@/components/motion/MotionProvider";
import { getEditionYears, getLatestEdition, getStories } from "@/lib/content";
import { storyCategories } from "@/lib/search";
import { siteConfig } from "@/data/siteConfig";
import { SITE_URL } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
import { categoryHref } from "@/lib/urls";

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

// Long-form reading: article text, standfirsts and pull quotes
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
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
    icon: [{ url: "/images/spice-route-logo.webp", type: "image/webp" }],
    // iOS home-screen icons must be PNG; this is the only non-WebP image
    apple: "/images/spice-route-logo.png",
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
  // Photographs for the pointer-side previews on text-only story lists
  const previews: Record<string, StoryPreview> = Object.fromEntries(
    getStories()
      .filter((s) => s.images[0])
      .map((s) => [s.href, { src: s.images[0].src, alt: s.images[0].alt, kicker: s.section }])
  );

  return (
    // data-theme may be set by the inline script before hydration
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${montserrat.variable} ${newsreader.variable}`} suppressHydrationWarning>
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
          storyMenu={storyCategories().map((c) => ({ href: categoryHref(c.id), label: c.name }))}
          years={getEditionYears()}
        />
        <main id="main-content" style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
        <BackToTop />
        <MotionProvider previews={previews} />
      </body>
    </html>
  );
}
