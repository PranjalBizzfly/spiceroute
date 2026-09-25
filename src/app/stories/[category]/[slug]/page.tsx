import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import { categoryLabel } from "@/components/StoryCard";
import StoryPager from "@/components/edition/StoryPager";
import InThisStory from "@/components/story/InThisStory";
import LightboxProvider, { type LightboxItem } from "@/components/story/Lightbox";
import ReadingProgress from "@/components/story/ReadingProgress";
import SourceStrip from "@/components/story/SourceStrip";
import StoryRail from "@/components/story/StoryRail";
import StorySideList from "@/components/story/StorySideList";
import StoryExtras from "@/components/story/StoryExtras";
import { extras } from "@/data/extras";
import SectionNav from "@/components/SectionNav";
import { MoreFromEdition, RelatedStories } from "@/components/story/StoryRelated";
import ArticleTools from "@/components/story/ArticleTools";
import PdfButton from "@/components/PdfButton";
import { editionDate, getEdition, getEditionStories, getStories, getStoryByPath } from "@/lib/content";
import { categorySlug, storyUrlSlug } from "@/lib/urls";
import { localImageSize } from "@/lib/imageSize";
import { siteConfig } from "@/data/siteConfig";
import { SITE_URL as SITE } from "@/lib/site";
import type { StoryEntry } from "@/types";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  // public addresses: /stories/<category slug>/<story slug> (lib/urls.ts)
  return getStories().map((s) => ({ category: categorySlug(s.category), slug: storyUrlSlug(s) }));
}

/** A landscape lead photograph is shown up to this multiple of its own width. */
const HERO_SCALE = 1.3;

/** How many further stories in the same section the side column carries. */
const RAIL_MORE = 3;

/**
 * How many other stories the left column lists. A story that also gives that
 * column a contents list or its topics needs fewer of them, so the column
 * still ends level with the text; one that gives it nothing else carries the
 * longer list rather than leaving the column short.
 */
const BRIEFS_WITH_CONTENTS = 5;
const BRIEFS_ALONE = 9;


/**
 * Stories to read next, only from verified relationships: the rest of the same
 * issue in printed order, then the same printed section or web category in
 * other issues (newest first). Previous/next are shown by the pager instead.
 */
function readNext(story: StoryEntry) {
  const skip = new Set([story.slug, story.previousStory?.slug, story.nextStory?.slug]);
  const issue = getEditionStories(story.editionSlug).filter((s) => !skip.has(s.slug));
  const others = getStories().filter((s) => !skip.has(s.slug) && s.editionSlug !== story.editionSlug);
  const bySection = others.filter((s) => s.section === story.section);
  const byCategory = others.filter((s) => s.category === story.category && s.section !== story.section);
  // related: this issue first, then the same printed section, then the same subject
  const related = [...issue.slice(0, 3), ...bySection, ...byCategory].slice(0, 6);
  const shown = new Set(related.map((s) => s.slug));
  // the rest of the issue, in printed order, that is not already shown
  const edition = issue.filter((s) => !shown.has(s.slug)).slice(0, 6);
  // The side column's own reading list: the same printed section, then the
  // same subject — never a story already set out at the foot of the page.
  const below = new Set([...related, ...edition].map((s) => s.slug));
  return {
    related,
    edition,
    sectionName: bySection.length ? story.section : categoryLabel(story.category),
    railMore: [...bySection, ...byCategory].filter((s) => !below.has(s.slug)).slice(0, RAIL_MORE),
  };
}

/** Display headline: printed headline, with the printed place label where set. */
const displayTitle = (s: { printedTitle: string; label?: string }) =>
  s.label ? `${s.printedTitle}: ${s.label}` : s.printedTitle;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const story = getStoryByPath(category, slug);
  if (!story) return { title: "Story Not Found" };

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
  const story = getStoryByPath(category, slug);
  if (!story) notFound();

  const edition = getEdition(story.editionSlug)!;
  const date = editionDate(edition);
  const next = readNext(story);
  // the left column also carries the story's contents and its topics where
  // the story has them; the list of other stories takes up the rest
  const hasContents = story.sections.length >= 3;
  const topics = story.tags ?? [];
  const briefCount = hasContents || topics.length ? BRIEFS_WITH_CONTENTS : BRIEFS_ALONE;
  // the left column: other stories, newest issues first
  const briefs = getStories().filter((s) => s.slug !== story.slug && s.images[0]).slice(0, briefCount);
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
    <>
      {/* section navigation: story pages only */}
      <SectionNav />
      <div className="ed-story ed-news">
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
          {/* Newspaper header: section, headline, standfirst, then a ruled
              meta line (byline · issue · reading time) with
              the story's actions */}


          <div className="ed-news__grid">
            <StorySideList
              stories={briefs}
              sections={hasContents ? story.sections : undefined}
              topics={topics}
            />
            <div className="ed-news__main">
              <header className="ed-story__header ed-news__head">
                {/* Printed section, then the printed place label where set */}
                <p className="ed-story__rubric">
                  <span className="ed-kicker ed-story__section">{story.section}</span>
                  {story.label && <span className="ed-article__label">{story.label}</span>}
                </p>
                <h1 className="ed-story__title">{story.printedTitle}</h1>
                {story.standfirst && <p className="ed-story__standfirst">{story.standfirst}</p>}

                <div className="ed-news__meta">
                  <p className="ed-news__facts">
                    {story.author && (
                      <span className="ed-news__byline">
                        {story.bylineLabel ?? "By"}&nbsp;<strong>{story.author}</strong>
                        {story.role && <span>, {story.role}</span>}
                      </span>
                    )}
                    <span>
                      <Link href={`/inflight-magazine/${edition.slug}`}>
                        {date}
                        {edition.issue ? ` · Issue ${edition.issue}` : ""}
                      </Link>
                    </span>
                  </p>
                  <div className="ed-news__toolbar">
                    <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} page={story.pdfPages[0]} className="ed-news__action ed-news__action--pdf">
                      View Original PDF <span aria-hidden="true">↗</span>
                    </PdfButton>
                    <ArticleTools title={displayTitle(story)} path={story.href} />
                  </div>
                </div>
              </header>
              {image && (
                <figure
                  className={`ed-article__figure ed-news__hero${portrait ? " ed-news__hero--portrait" : ""}`}
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
                      sizes={portrait ? "(max-width: 767px) 92vw, 480px" : "(max-width: 767px) 92vw, 672px"}
                    />
                  </div>
                  <figcaption>
                    {heroCaption && <span>{heroCaption}</span>}
                    <span className="ed-news__credit">Spice Route, {date}</span>
                  </figcaption>
                </figure>
              )}

              {hasBody && (
                <LightboxProvider items={photos} title={displayTitle(story)}>
                  <div className="ed-story__body">
                    {hasContents && <InThisStory sections={story.sections} />}
                    <ArticleBody
                      body={story.body}
                      pullQuotes={story.pullQuotes}
                      galleries={story.galleryGroups}
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

              <StoryExtras extras={extras[story.slug] ?? []} />

              {topics.length > 0 && (
                <ul className="ed-story__tags ed-story__tags--inline" aria-label="Topics">
                  {topics.map((tag) => (
                    <li key={tag} className="badge badge-outline">{tag}</li>
                  ))}
                </ul>
              )}

            </div>

            <StoryRail
              story={story}
              edition={edition}
              issue={getEditionStories(story.editionSlug)}
              more={next.railMore}
              moreTitle={next.sectionName}
            />
          </div>
        </article>

        <RelatedStories stories={next.related} title={`Related stories${next.sectionName ? ` · ${next.sectionName}` : ""}`} />

        <MoreFromEdition
          stories={next.edition}
          editionHref={`/inflight-magazine/${edition.slug}`}
          editionName={date}
          total={edition.storyIds.length}
        />

        <StoryPager previous={story.previousStory} next={story.nextStory} edition={story.edition} />

        {/* The printed source, last: the whole edition as it was printed */}
        <footer className="ed-story__end">
          <SourceStrip variant="close" {...source} />
        </footer>
      </div>
      </div>
    </>
  );
}
