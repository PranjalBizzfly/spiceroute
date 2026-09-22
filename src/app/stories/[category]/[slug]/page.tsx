import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import StoryCard, { categoryLabel } from "@/components/StoryCard";
import StoryPager from "@/components/edition/StoryPager";
import InThisStory from "@/components/story/InThisStory";
import LightboxProvider, { type LightboxItem } from "@/components/story/Lightbox";
import ReadingProgress from "@/components/story/ReadingProgress";
import SourceStrip from "@/components/story/SourceStrip";
import { editionDate, getEdition, getEditionStories, getStories, getStory } from "@/lib/content";
import { localImageSize } from "@/lib/imageSize";
import { siteConfig } from "@/data/siteConfig";
import { SITE_URL as SITE } from "@/lib/site";
import type { StoryEntry } from "@/types";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  return getStories().map((s) => ({ category: s.category, slug: s.slug }));
}

/** A landscape lead photograph is shown up to this multiple of its own width. */
const HERO_SCALE = 1.3;

/**
 * Stories to read next, only from verified relationships: the rest of the same
 * issue in printed order, then the same printed section or web category in
 * other issues (newest first). Previous/next are shown by the pager instead.
 */
function readNext(story: StoryEntry) {
  const skip = new Set([story.slug, story.previousStory?.slug, story.nextStory?.slug]);
  const issue = getEditionStories(story.editionSlug).filter((s) => !skip.has(s.slug)).slice(0, 3);
  issue.forEach((s) => skip.add(s.slug));
  const others = getStories().filter((s) => !skip.has(s.slug) && s.editionSlug !== story.editionSlug);
  const bySection = others.filter((s) => s.section === story.section);
  const section = (bySection.length ? bySection : others.filter((s) => s.category === story.category)).slice(0, 3);
  return { issue, section, sectionName: bySection.length ? story.section : categoryLabel(story.category) };
}

/** Display headline: printed headline, with the printed place label where set. */
const displayTitle = (s: { printedTitle: string; label?: string }) =>
  s.label ? `${s.printedTitle}: ${s.label}` : s.printedTitle;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const story = getStory(slug);
  if (!story || story.category !== category) return { title: "Story Not Found" };

  const title = displayTitle(story);
  const image = story.images[0];
  return {
    title: `${title} | Spice Route ${editionDate(story.edition)}`,
    description: story.summary,
    authors: story.author ? [{ name: story.author }] : undefined,
    alternates: { canonical: story.href },
    openGraph: {
      type: "article",
      url: story.href,
      title,
      description: story.summary,
      siteName: "Spice Route Magazine",
      ...(story.author ? { authors: [story.author] } : {}),
      section: story.section,
      ...(image ? { images: [{ url: image.src, alt: image.alt }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: story.summary,
      ...(image ? { images: [image.src] } : {}),
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { category, slug } = await params;
  const story = getStory(slug);
  if (!story || story.category !== category) notFound();

  const edition = getEdition(story.editionSlug)!;
  const date = editionDate(edition);
  const next = readNext(story);
  const image = story.images[0];
  // Shown at its own proportions — never cropped. Portrait photographs sit
  // beside the headline on wide screens; landscape ones run wide under it,
  // never beyond HERO_SCALE × their own pixels.
  const size = image ? localImageSize(image.src) : undefined;
  const portrait = Boolean(size && size.height > size.width * 1.1);
  const heroMax = size ? Math.round(size.width * HERO_SCALE) : undefined;
  const source = {
    edition: { ...story.edition, issue: edition.issue },
    pdfUrl: edition.pdfUrl,
    pdfPage: story.pdfPages[0],
    printedPages: story.printedPages,
  };

  // The story's printed photographs, in printed order, for the lightbox
  const photos: LightboxItem[] = story.galleryGroups.flatMap((g) =>
    g.images.map((img) => ({ ...img, printedPages: g.printedPages, captions: g.captions }))
  );
  // A lead caption also printed in a page's caption block is shown there once
  const heroCaption =
    image?.caption && !story.galleryGroups.some((g) => g.captions.some((c) => c.items.includes(image.caption!)))
      ? image.caption
      : undefined;
  const hasBody = story.body.length > 0 || photos.length > 0;

  // Article structured data from verified fields only (no invented dates).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: displayTitle(story),
    description: story.summary,
    articleSection: story.section,
    ...(story.author ? { author: { "@type": "Person", name: story.author } } : {}),
    ...(image ? { image: [image.src.startsWith("http") ? image.src : `${SITE}${image.src}`] } : {}),
    mainEntityOfPage: `${SITE}${story.href}`,
    publisher: { "@type": "Organization", name: siteConfig.publisher.name },
    isPartOf: {
      "@type": "PublicationIssue",
      name: edition.title,
      ...(edition.issue ? { issueNumber: String(edition.issue) } : {}),
      url: `${SITE}/inflight-magazine/${edition.slug}`,
      isPartOf: { "@type": "Periodical", name: "Spice Route" },
    },
    ...(story.pdfPages.length ? { pagination: `${story.printedPages[0]}-${story.printedPages[story.printedPages.length - 1]}` } : {}),
  };
  // Mirrors the visible breadcrumb
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ["Home", SITE],
      ["Inflight Magazine", `${SITE}/inflight-magazine`],
      [date, `${SITE}/inflight-magazine/${edition.slug}`],
      [displayTitle(story), `${SITE}${story.href}`],
    ].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };

  return (
    <div className="ed-story">
      {story.body.length > 0 && <ReadingProgress target=".ed-story__body" />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />

      <div className="container">
        <nav aria-label="Breadcrumb" className="ed-crumbs">
          <ol>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/inflight-magazine">Inflight Magazine</Link></li>
            <li><Link href={`/inflight-magazine/${edition.slug}`}>{date}</Link></li>
            <li aria-current="page">{displayTitle(story)}</li>
          </ol>
        </nav>

        <article className="ed-story__article">
          <div className={`ed-story__opener${image ? (portrait ? " ed-story__opener--split" : " ed-story__opener--wide") : ""}`}>
            <header className="ed-story__header">
              {/* Printed section, then the printed place label where set */}
              <p className="ed-story__rubric">
                <span className="ed-kicker ed-story__section">{story.section}</span>
                {story.label && <span className="ed-article__label">{story.label}</span>}
              </p>
              <h1 className="ed-story__title">{story.printedTitle}</h1>
              {story.standfirst && <p className="ed-story__standfirst">{story.standfirst}</p>}

              <p className="ed-story__byline">
                {story.author && (
                  <span>
                    {story.bylineLabel ?? "By"} <strong>{story.author}</strong>
                    {story.role && <span>, {story.role}</span>}
                  </span>
                )}
                <span>{story.readingTime}</span>
              </p>

              <SourceStrip variant="open" {...source} />
            </header>

            {image && (
              <figure
                className="ed-article__figure"
                // never shown much beyond the photograph's own resolution
                style={heroMax ? ({ "--img-max": `${heroMax}px` } as React.CSSProperties) : undefined}
              >
                <div
                  className="ed-article__image"
                  style={size ? { aspectRatio: `${size.width} / ${size.height}` } : undefined}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    loading="eager"
                    fetchPriority="high"
                    sizes={portrait ? "(max-width: 1023px) 92vw, 520px" : `(max-width: 1100px) 92vw, ${Math.min(heroMax ?? 1040, 1040)}px`}
                  />
                </div>
                {heroCaption && <figcaption>{heroCaption}</figcaption>}
              </figure>
            )}
          </div>

          {hasBody && (
            <LightboxProvider items={photos} title={displayTitle(story)}>
              <div className="ed-story__body">
                {story.sections.length >= 3 && <InThisStory sections={story.sections} />}
                <ArticleBody
                  body={story.body}
                  pullQuotes={story.pullQuotes}
                  galleries={story.galleryGroups}
                  pdfUrl={edition.pdfUrl}
                  editionTitle={edition.title}
                  collapsible={story.collapsible}
                />
              </div>
            </LightboxProvider>
          )}

          {story.callouts && story.callouts.length > 0 && (
            <aside className="ed-article__callouts" aria-label="SpiceJet flights">
              {story.callouts.map((c) => (
                <p key={c} className="ed-article__callout">{c}</p>
              ))}
            </aside>
          )}

          {story.tags && story.tags.length > 0 && (
            <ul className="ed-story__tags" aria-label="Topics">
              {story.tags.map((tag) => (
                <li key={tag} className="badge badge-outline">{tag}</li>
              ))}
            </ul>
          )}

          {/* The end of the story: its print source, one step away */}
          <footer className="ed-story__end">
            <SourceStrip variant="close" {...source} />
          </footer>
        </article>

        <StoryPager previous={story.previousStory} next={story.nextStory} edition={story.edition} />

        {next.issue.length > 0 && (
          <section className="ed-story__related" aria-labelledby="issue-more-title">
            <div className="ed-shead">
              <div className="ed-shead__main">
                <p className="ed-kicker">{edition.issue ? `Issue ${edition.issue} · ${date}` : date}</p>
                <h2 id="issue-more-title" className="ed-shead__title">More from this issue</h2>
              </div>
              <Link href={`/inflight-magazine/${edition.slug}#in-this-issue`} className="ed-more">
                All {edition.storyIds.length} stories in this issue
                <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <div className="ed-row ed-row--3 ed-related">
              {next.issue.map((s) => (
                <StoryCard key={s.slug} story={s} variant="standard" sizes="(max-width: 619px) 92vw, (max-width: 979px) 46vw, 390px" />
              ))}
            </div>
          </section>
        )}

        {next.section.length > 0 && (
          <section className="ed-story__related ed-story__related--more" aria-labelledby="section-more-title">
            <div className="ed-shead">
              <div className="ed-shead__main">
                <p className="ed-kicker">From other issues</p>
                <h2 id="section-more-title" className="ed-shead__title">More {next.sectionName}</h2>
              </div>
            </div>
            <div className="ed-row ed-row--3 ed-related">
              {next.section.map((s) => (
                <StoryCard key={s.slug} story={s} variant="standard" showEdition sizes="(max-width: 619px) 92vw, (max-width: 979px) 46vw, 390px" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
