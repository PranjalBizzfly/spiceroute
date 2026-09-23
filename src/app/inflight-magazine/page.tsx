import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import EditionCard from "@/components/EditionCard";
import PdfButton from "@/components/PdfButton";
import ArchiveBrowser, { type ArchiveEdition } from "@/components/archive/ArchiveBrowser";
import { editionDate, getEditionStories, getEditionYears, getEditions, getLatestEdition } from "@/lib/content";

const editions = getEditions();
const webEditions = editions.filter((e) => !e.pdfOnly);
const description = `All ${editions.length} editions of Spice Route, the inflight magazine of SpiceJet, newest first. ${webEditions.length} recent issues can be read as web stories; every edition is available as the original PDF.`;

export const metadata: Metadata = {
  title: "Inflight Magazine Archive | Spice Route",
  description,
  alternates: { canonical: "/inflight-magazine" },
  openGraph: {
    type: "website",
    url: "/inflight-magazine",
    title: "Spice Route — Inflight Magazine Archive",
    description,
    images: [{ url: getLatestEdition().cover, alt: `Cover of ${getLatestEdition().title}` }],
  },
  twitter: { card: "summary_large_image", title: "Spice Route — Inflight Magazine Archive", description },
};

export default function InflightMagazinePage() {
  const latest = getLatestEdition();
  const latestStories = getEditionStories(latest.slug);
  const years = getEditionYears();

  // Only verified data goes into the searchable index.
  const items: ArchiveEdition[] = editions.map((e) => ({
    edition: {
      slug: e.slug, title: e.title, month: e.month, year: e.year, volume: e.volume, issue: e.issue,
      cover: e.cover, pdfUrl: e.pdfUrl, storyIds: e.storyIds, pdfOnly: e.pdfOnly,
    },
    stories: getEditionStories(e.slug).map((s) => ({
      title: s.printedTitle,
      ...(s.label ? { label: s.label } : {}),
      section: s.section,
      ...(s.author ? { author: s.author } : {}),
      href: s.href,
    })),
  }));

  const cards = Object.fromEntries(items.map((i) => [i.edition.slug, <EditionCard key={i.edition.slug} edition={i.edition} />]));

  return (
    <div className="ed-archive-page">
      <section className="ed-issue__hero ed-pagehero ed-scope-dark" aria-labelledby="archive-title">
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li aria-current="page">Inflight Magazine</li>
            </ol>
          </nav>

          <div className="ed-pagehead">
            <div className="ed-archive__head">
              <p className="ed-kicker">The Inflight Magazine of SpiceJet</p>
              <h1 id="archive-title" className="ed-issue__title">
                <span className="ed-issue__masthead">Spice Route</span>
                Every edition
              </h1>
              <p className="ed-shead__sub">{description}</p>
            </div>
            {/* The latest covers, fanned out */}
            <div className="ed-fan" aria-hidden="true">
              {editions.slice(0, 5).map((e, i) => (
                <div key={e.slug} className="ed-fan__cover" style={{ "--i": i } as React.CSSProperties}>
                  <Image src={e.cover} alt="" fill sizes="220px" loading={i === 0 ? "eager" : "lazy"} />
                </div>
              ))}
            </div>
          </div>

          {/* Latest edition leads the archive */}
          <article className="ed-latest ed-latest--panel" aria-labelledby="latest-title">
            <Link href={`/inflight-magazine/${latest.slug}`} className="ed-latest__cover" tabIndex={-1} aria-hidden="true">
              <Image src={latest.cover} alt="" fill loading="eager" fetchPriority="high" sizes="(max-width: 767px) 66vw, 320px" />
            </Link>
            <div className="ed-latest__body">
              <p className="ed-kicker ed-kicker--red">Latest edition</p>
              <h2 id="latest-title" className="ed-latest__title">
                <Link href={`/inflight-magazine/${latest.slug}`}>{editionDate(latest)}</Link>
              </h2>
              <p className="ed-latest__meta">
                {latest.issue ? `Volume ${latest.volume} · Issue ${latest.issue} · ` : ""}
                {latestStories.length} web {latestStories.length === 1 ? "story" : "stories"}

              </p>
              {latestStories.length > 0 && (
                <ul className="ed-latest__stories">
                  {latestStories
                    .filter((s) => s.section !== "Welcome Aboard")
                    .slice(0, 4)
                    .map((s) => (
                      <li key={s.slug}>
                        <Link href={s.href}>
                          <span className="ed-latest__section">{s.section}</span>
                          {s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
              <div className="ed-actions">
                <Link href={`/inflight-magazine/${latest.slug}`} className="btn btn-primary">
                  {latest.pdfOnly ? "Open edition" : "Read Online"} <span aria-hidden="true">&rarr;</span>
                </Link>
                <PdfButton pdfUrl={latest.pdfUrl} title={latest.title} className="ed-more ed-issue__pdf">
                  View Original PDF <span aria-hidden="true">↗</span>
                </PdfButton>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="ed-section" aria-label="All editions">
        <div className="container">
          <ArchiveBrowser items={items} years={years} cards={cards} />
        </div>
      </section>
    </div>
  );
}
