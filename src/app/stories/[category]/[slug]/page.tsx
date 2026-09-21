import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import PdfButton from "@/components/PdfButton";
import StoryCard from "@/components/StoryCard";
import StoryPager from "@/components/edition/StoryPager";
import InThisStory from "@/components/story/InThisStory";
import LightboxProvider, { type LightboxItem } from "@/components/story/Lightbox";
import ReadingProgress from "@/components/story/ReadingProgress";
import { editionDate, getEdition, getRelatedStories, getStories, getStory } from "@/lib/content";
import { localImageSize } from "@/lib/imageSize";
import { siteConfig } from "@/data/siteConfig";
import { SITE_URL as SITE } from "@/lib/site";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateStaticParams() {
  return getStories().map((s) => ({ category: s.category, slug: s.slug }));
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 16.5h7" />
    </svg>
  );
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
  const related = getRelatedStories(slug, 3);
  const image = story.images[0];
  // Shown at its own proportions — never cropped. Portrait photographs sit
  // beside the headline on wide screens.
  const size = image ? localImageSize(image.src) : undefined;
  const portrait = Boolean(size && size.height > size.width * 1.1);
  const pages = story.printedPages;
  const pageRange = `${pages[0]}${pages.length > 1 ? `–${pages[pages.length - 1]}` : ""}`;

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

  return (
    <div className="ed-story">
      {story.body.length > 0 && <ReadingProgress target=".ed-story__body" />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
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
              <p className="ed-story__edition">
                <Link href={`/inflight-magazine/${edition.slug}`}>
                  From the {date} edition
                  {edition.issue ? ` · Issue ${edition.issue}` : ""}
                </Link>
              </p>
              <p className="ed-kicker ed-story__section">{story.section}</p>
              {story.label && <p className="ed-article__label">{story.label}</p>}
              <h1 className="ed-story__title">{story.printedTitle}</h1>
              {story.standfirst && <p className="ed-story__standfirst">{story.standfirst}</p>}

              <div className="ed-story__byline">
                {story.author && (
                  <span>
                    {story.bylineLabel ?? "By"} <strong>{story.author}</strong>
                    {story.role && <span>, {story.role}</span>}
                  </span>
                )}
                <span>{story.readingTime}</span>
                <span>
                  Page{pages.length > 1 ? "s" : ""} {pageRange} in print
                </span>
              </div>

              <p className="ed-story__original">
                <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} page={story.pdfPages[0]} className="ed-story__pdf">
                  <PdfIcon />
                  View original PDF
                  <span className="ed-story__pdfpages">p. {pageRange}</span>
                </PdfButton>
              </p>
            </header>

            {image && (
              <figure
                className="ed-article__figure"
                // photographs printed small stay near their own resolution
                style={size && size.width * 1.6 < 800 ? { maxWidth: Math.round(size.width * 1.6), marginInline: "auto" } : undefined}
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
                    sizes={portrait ? "(max-width: 1023px) 92vw, 520px" : "(max-width: 832px) 92vw, 800px"}
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
        </article>

        <StoryPager previous={story.previousStory} next={story.nextStory} edition={story.edition} />

        {/* Back to the issue */}
        <aside className="ed-story__issue" aria-label="Edition">
          <Link href={`/inflight-magazine/${edition.slug}`} className="ed-story__issuecover" tabIndex={-1} aria-hidden="true">
            <Image src={edition.cover} alt="" fill sizes="96px" loading="lazy" />
          </Link>
          <div>
            <p className="ed-kicker">Published in</p>
            <p className="ed-story__issuetitle">
              <Link href={`/inflight-magazine/${edition.slug}`}>
                {edition.title}
              </Link>
            </p>
            <p className="ed-story__issuemeta">
              {edition.storyIds.length} web {edition.storyIds.length === 1 ? "story" : "stories"} from this issue
              {edition.pageCount ? ` · ${edition.pageCount} pages in print` : ""}
            </p>
          </div>
          <div className="ed-story__issueactions">
            <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} page={story.pdfPages[0]} className="btn btn-outline btn-sm">
              This story in the PDF
            </PdfButton>
            <Link href={`/inflight-magazine/${edition.slug}`} className="btn btn-outline btn-sm">
              See the whole edition <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </aside>

        {related.length > 0 && (
          <section className="ed-story__related" aria-labelledby="related-title">
            <div className="ed-shead">
              <div className="ed-shead__main">
                <p className="ed-kicker">Keep reading</p>
                <h2 id="related-title" className="ed-shead__title">Related stories</h2>
              </div>
            </div>
            <div className="ed-row ed-row--3 ed-related">
              {related.map((s) => (
                <StoryCard
                  key={s.slug}
                  story={s}
                  variant="standard"
                  showEdition
                  sizes="(max-width: 619px) 92vw, (max-width: 979px) 46vw, 390px"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
