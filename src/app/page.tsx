import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { stories } from "@/data/stories";
import { siteConfig } from "@/data/siteConfig";
import { Story } from "@/types";
import EditionCard from "@/components/EditionCard";
import PartnerLogos from "@/components/PartnerLogos";
import PdfButton from "@/components/PdfButton";
import Reveal from "@/components/Reveal";
import StatsSection from "@/components/StatsSection";
import StoryCard, { categoryLabel, storyKicker } from "@/components/StoryCard";
import StoryIndexList from "@/components/StoryIndexList";
import PlatePhoto from "@/components/PlatePhoto";
import IssueIndex from "@/components/edition/IssueIndex";
import HeroCarousel, { type HeroSlide } from "@/components/home/HeroCarousel";
import StoryChapter, { type ChapterItem } from "@/components/home/StoryChapter";
import Shelf from "@/components/home/Shelf";
import { editionDate, getEditions, getEditionStories, getLatestEdition, storyHref } from "@/lib/content";
import { imageFocus } from "@/lib/imageFocus";
import { storyCategories } from "@/lib/search";
import { categoryHref } from "@/lib/urls";

/* --------------------------------------------------------------------------
   Editorial running order.
   Every story below comes from the verified inventory in src/data/stories.ts —
   nothing is invented, and each story is placed at most once. pick() skips a
   slug that no longer exists, so a removed story never breaks the page.
   The full-bleed places use only photographs extracted at 1600px, so they
   stay sharp across the screen.
   -------------------------------------------------------------------------- */

// Opening slides: the lead places of the latest issues
const HERO = [
  "five-monsoon-escapes-rain-kissed-splendour",
  "sittong-orange-valley-hills",
  "varanasi-the-eternal-city",
  "summertimes-vintage-escapes",
];

// Chapter one: journeys, told as the reader scrolls
const JOURNEYS = [
  "day-in-a-city-pune",
  "dreaming-of-munnar",
  "shillong-symphony-of-clouds",
  "kathmandu-to-the-land-of-mystic-trails",
];

// One place across the whole screen, with its printed pull quote
const PANORAMA = "ayodhya-where-history-meets-faith";

// Three plates, never from the current issue (it is listed in full above);
// pick() skips any that are, and the spares keep the row at three
const FOOD = ["from-estate-to-espresso", "japanese-desserts-india", "at-home-easy-protein-fixes", "hallyu-hits-home"];

// Conversations: portrait, printed pull quote
// (never from the current issue; four fill the row, spares keep it full)
const VOICES = [
  "shalini-passi-a-life-shaped-by-art",
  "vaibhav-tatwawadi-if-story-excites-me",
  "parineeti-chopra-hitting-the-right-notes",
  "ed-sheeran-hoping-srk-will-be-in-my-music-video",
  "pankaj-jha-i-dont-think-too-much-about-acting",
  "vineeta-singh-a-shark-of-all-times",
];

const CULTURE = [
  "icons-of-new-india",
  "kitchen-healing-traditional-superfoods",
  "live-long-travel-longer",
  "garden-glory-flower-festivals",
  "house-of-quirk-unusual-museums",
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** A printed pull quote in quotation marks, unless it was printed with them. */
const quoted = (text: string) => (/^[“"‘]/.test(text) ? text : `“${text}”`);

/** Section opening: chapter number, kicker, serif title, optional link. */
function SectionHead({
  id,
  chapter,
  kicker,
  title,
  sub,
  more,
  center,
}: {
  id: string;
  chapter?: number;
  kicker: string;
  title: React.ReactNode;
  sub?: string;
  more?: { href: string; label: string };
  center?: boolean;
}) {
  return (
    <Reveal>
      <div className={`ed-shead ed-shead--x${center ? " ed-shead--center" : ""}`}>
        <div className="ed-shead__main">
          <p className="ed-kicker ed-kicker--rule">
            {chapter !== undefined && <span className="ed-shead__chapter">Chapter {pad(chapter)}</span>}
            {kicker}
          </p>
          <h2 id={id} className="ed-shead__title">
            {title}
          </h2>
          {sub && <p className="ed-shead__sub">{sub}</p>}
        </div>
        {more && (
          <Link href={more.href} className="ed-more">
            {more.label}
            <span className="ed-more__arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        )}
      </div>
    </Reveal>
  );
}

export default function HomePage() {
  const editions = getEditions();
  const latestEdition = getLatestEdition();
  const issueStories = getEditionStories(latestEdition.slug);
  const shelfEditions = editions.slice(1, 13);
  const onlineEditions = editions.filter((e) => !e.pdfOnly).length;
  const categories = storyCategories();

  const bySlug = new Map(stories.map((story) => [story.slug, story]));
  const used = new Set<string>();
  const pick = (slugs: string[]): Story[] => {
    const selected: Story[] = [];
    slugs.forEach((slug) => {
      const story = bySlug.get(slug);
      if (story && !used.has(slug)) {
        used.add(slug);
        selected.push(story);
      }
    });
    return selected;
  };

  const withImage = (s: Story) => Boolean(s.heroImage);
  const heroStories = pick(HERO).filter(withImage);
  // The current issue is listed in full under "The latest issue"
  issueStories.forEach((s) => used.add(s.slug));
  const journeyStories = pick(JOURNEYS).filter(withImage);
  const panorama = pick([PANORAMA]).filter(withImage)[0];
  const foodStories = pick(FOOD.filter((slug) => !used.has(slug)).slice(0, 3));
  const voiceStories = pick(
    VOICES.filter((slug) => !used.has(slug) && bySlug.get(slug)?.heroImage && bySlug.get(slug)?.pullQuotes?.length).slice(0, 4)
  );
  const cultureStories = pick(CULTURE);
  const [cultureLead, ...cultureRest] = cultureStories;

  const latestHref = `/inflight-magazine/${latestEdition.slug}`;

  const slides: HeroSlide[] = heroStories.map((s) => ({
    href: storyHref(s),
    title: s.title,
    kicker: storyKicker(s) ?? categoryLabel(s.category),
    excerpt: s.excerpt,
    image: s.heroImage!,
    alt: s.heroImageAlt ?? "",
    focus: imageFocus(s.heroImage),
    edition: s.editionTitle,
  }));

  const chapter: ChapterItem[] = journeyStories.map((s) => ({
    href: storyHref(s),
    title: s.title,
    kicker: storyKicker(s) ?? categoryLabel(s.category),
    excerpt: s.excerpt,
    image: s.heroImage!,
    alt: s.heroImageAlt ?? "",
    focus: imageFocus(s.heroImage),
    meta: [s.author, s.editionTitle].filter(Boolean).join(" · "),
  }));

  // Curated category covers when a printed section header is unsuited as a card plate
  const CATEGORY_COVERS: Record<string, { heroImage: string; heroImageAlt: string }> = {
    predictions: {
      heroImage: "/images/stories/predictions-category.webp",
      heroImageAlt: "The stone astronomical and astrological instruments of Jantar Mantar observatory under a blue sky",
    },
  };

  // Each web category, pictured by its curated cover or one of its photographed stories
  const categoryTiles = categories
    .map((c) => {
      const customCover = CATEGORY_COVERS[c.id] ?? CATEGORY_COVERS[c.slug];
      const storyCover = stories.find((s) => (s.category === c.id || s.category === c.slug) && s.heroImage);
      return {
        ...c,
        cover: customCover ?? (storyCover ? { heroImage: storyCover.heroImage!, heroImageAlt: storyCover.heroImageAlt ?? "" } : undefined),
      };
    })
    .filter((c) => c.count > 0);

  return (
    <>
      {/* 1. OPENING — full-bleed stories from the latest issues */}
      {/* Slide 1 is the spiceroutemagazine.in brand hero; the stories follow */}
      <HeroCarousel
        slides={slides}
        label="Spice Route and stories from the latest issues"
        intro={{
          title: siteConfig.name,
          node: (
            <div className="ed-shero ed-shero--home">
              <div className="ed-shero__inner">
                <div className="ed-shero__text">
                  <p className="ed-shero__kicker">A Publication by</p>
                  <Image
                    src="/images/hero/nkn-media-logo.webp"
                    alt={siteConfig.publisher.name}
                    width={469}
                    height={328}
                    className="ed-shero__logo"
                    sizes="110px"
                    priority
                  />
                  <h1 id="hero-title" className="ed-shero__title">
                    Discover stories, destinations, and inspiration with SpiceRoute
                  </h1>
                  <p className="ed-shero__lede">{siteConfig.description}</p>
                  <Link href="/contact" className="ed-shero__btn">
                    Publish Your Story
                  </Link>
                </div>
                <div className="ed-shero__media">
                  <Image
                    src="/images/hero/home-hero-magazines.webp"
                    alt="Spice Route magazine covers in flight beside a SpiceJet aircraft"
                    width={1600}
                    height={984}
                    sizes="(max-width: 767px) 100vw, (max-width: 1024px) 90vw, 56vw"
                    priority
                  />
                </div>
              </div>
              <svg className="ed-shero__shape" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M0,100V95L738,1L1000,94.4V100Z" />
              </svg>
            </div>
          ),
        }}
      />

      {/* 3. THE LATEST ISSUE — cover beside its contents page */}
      <section id="current-issue" className="ed-section ed-now" aria-labelledby="current-issue-title">
        <div className="container">
          <SectionHead
            id="current-issue-title"
            kicker={latestEdition.issue ? `Issue ${latestEdition.issue} · ${editionDate(latestEdition)}` : editionDate(latestEdition)}
            title="The latest issue"
            more={{ href: `${latestHref}#in-this-issue`, label: "Full contents" }}
          />
          <div className="ed-now__grid">
            <Reveal className="ed-now__issue">
              <Link href={latestHref} className="ed-now__cover" tabIndex={-1} aria-hidden="true">
                <Image src={latestEdition.cover} alt="" fill sizes="(max-width: 767px) 60vw, 340px" />
              </Link>
              <p className="ed-now__facts">
                {latestEdition.issue ? `Volume ${latestEdition.volume} · Issue ${latestEdition.issue}` : latestEdition.title}

              </p>
              <div className="ed-actions">
                <Link href={latestHref} className="btn btn-primary">
                  Read this issue <span aria-hidden="true">&rarr;</span>
                </Link>
                <PdfButton pdfUrl={latestEdition.pdfUrl} title={latestEdition.title} className="ed-more ed-issue__pdf">
                  Original PDF <span aria-hidden="true">↗</span>
                </PdfButton>
              </div>
            </Reveal>
            <Reveal className="ed-now__index" delay={80}>
              <IssueIndex stories={issueStories} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4. CHAPTER ONE — journeys, told as the reader scrolls */}
      {chapter.length > 0 && (
        <section id="journeys" className="ed-section ed-section--paper" aria-labelledby="journeys-title">
          <div className="container">
            <SectionHead
              id="journeys-title"
              chapter={1}
              kicker={`${categoryLabel("travel")} · ${categoryLabel("destinations")}`}
              title="Journeys across India and beyond"
              more={{ href: categoryHref("destinations"), label: "More destinations" }}
            />
            <StoryChapter items={chapter} />
          </div>
        </section>
      )}

      {/* 5. PANORAMA — one place across the whole screen */}
      {panorama && (
        <section className="ed-panorama" aria-labelledby="panorama-title">
          <div className="ed-panorama__media">
            <Image
              src={panorama.heroImage!}
              alt={panorama.heroImageAlt ?? ""}
              fill
              sizes="100vw"
              style={{ objectPosition: imageFocus(panorama.heroImage) }}
            />
          </div>
          <div className="container ed-panorama__inner">
            <Reveal className="ed-panorama__card">
              <p className="ed-kicker">{storyKicker(panorama) ?? categoryLabel(panorama.category)}</p>
              <h2 id="panorama-title" className="ed-panorama__title">
                <Link href={storyHref(panorama)}>{panorama.title}</Link>
              </h2>
              {panorama.pullQuotes?.[0] ? (
                <blockquote className="ed-panorama__quote">{quoted(panorama.pullQuotes[0])}</blockquote>
              ) : (
                panorama.excerpt && <p className="ed-panorama__excerpt">{panorama.excerpt}</p>
              )}
              <p className="ed-panorama__meta">{[panorama.author, panorama.editionTitle].filter(Boolean).join(" · ")}</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* 6. CHAPTER TWO — food, three plates side by side */}
      {foodStories.length > 0 && (
        <section id="cuisine" className="ed-section" aria-labelledby="food-title">
          <div className="container">
            <SectionHead
              id="food-title"
              chapter={2}
              kicker={categoryLabel("cuisine")}
              title="Food & Flavours"
              more={{ href: categoryHref("cuisine"), label: "All food stories" }}
            />
            <div className="ed-triptych">
              {foodStories.map((story, i) => (
                <Reveal key={story.slug} delay={i * 90}>
                  <StoryCard story={story} variant="standard" showEdition sizes="(max-width: 639px) 92vw, (max-width: 1099px) 31vw, 380px" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. CHAPTER THREE — conversations, each with its printed pull quote */}
      {voiceStories.length > 0 && (
        <section id="conversations" className="ed-section ed-voices" aria-labelledby="voices-title">
          <div className="container">
            <SectionHead
              id="voices-title"
              chapter={3}
              kicker={categoryLabel("interviews")}
              title="In conversation"
              more={{ href: categoryHref("interviews"), label: "All conversations" }}
            />
            <ul className="ed-voices__grid">
              {voiceStories.map((s, i) => (
                <Reveal as="li" key={s.slug} delay={i * 80} className="ed-voice">
                  <div className="ed-voice__portrait">
                    <PlatePhoto
                      src={s.heroImage!}
                      alt={s.heroImageAlt ?? ""}
                      sizes="(max-width: 559px) 92vw, (max-width: 1099px) 46vw, 300px"
                    />
                  </div>
                  {s.pullQuotes?.[0] && <blockquote className="ed-voice__quote">{quoted(s.pullQuotes[0])}</blockquote>}
                  <h3 className="ed-voice__title">
                    <Link href={storyHref(s)}>{s.title}</Link>
                  </h3>
                  <p className="ed-voice__meta">{s.editionTitle}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 8. CHAPTER FOUR — culture and wellness: the lead beside a contents column */}
      {cultureLead && (
        <section id="culture" className="ed-section ed-section--paper" aria-labelledby="culture-title">
          <div className="container">
            <SectionHead
              id="culture-title"
              chapter={4}
              kicker={`${categoryLabel("culture")} · ${categoryLabel("wellness")}`}
              title="Culture & Wellness"
              more={{ href: categoryHref("culture"), label: "All culture stories" }}
            />
            <div className="ed-spread">
              <Reveal>
                <StoryCard story={cultureLead} variant="featured" showEdition stacked sizes="(max-width: 999px) 92vw, 700px" />
              </Reveal>
              <Reveal delay={90}>
                <StoryIndexList stories={cultureRest} startIndex={2} withThumbs />
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* 9. EXPLORE BY SUBJECT — every web category, with its story count */}
      <section id="subjects" className="ed-section" aria-labelledby="subjects-title">
        <div className="container">
          <SectionHead id="subjects-title" kicker="Explore" title="Find your next story" sub="Every story on the site, by subject." />
          <ul className="ed-tiles">
            {categoryTiles.map((c, i) => (
              <Reveal as="li" key={c.slug} delay={(i % 3) * 60} className="ed-tile">
                {c.cover?.heroImage ? (
                  <div className="ed-tile__media">
                    <PlatePhoto
                      src={c.cover.heroImage}
                      alt={c.cover.heroImageAlt ?? `${c.name} category`}
                      sizes="(max-width: 559px) 92vw, (max-width: 1023px) 46vw, 400px"
                    />
                  </div>
                ) : (
                  // no photographed story in this subject: the same plate, set in type
                  <div className="ed-tile__media ed-tile__media--type" aria-hidden="true">
                    <span>{c.name}</span>
                  </div>
                )}
                <div className="ed-tile__body">
                  <h3 className="ed-tile__title">
                    <Link href={categoryHref(c.id)}>{c.name}</Link>
                  </h3>
                  <p className="ed-tile__text">{c.description}</p>
                  <p className="ed-tile__count">
                    {c.count} {c.count === 1 ? "story" : "stories"} <span aria-hidden="true">&rarr;</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 10. HOW TO READ — from the archive to the original edition */}
      <section className="ed-section ed-steps" aria-labelledby="steps-title">
        <div className="container">
          <SectionHead id="steps-title" kicker="Reading Spice Route" title="Every issue, two ways to read it" center />
          <ol className="ed-steps__list">
            <Reveal as="li" className="ed-step">
              <p className="ed-step__num" aria-hidden="true">01</p>
              <h3 className="ed-step__title">Choose an edition</h3>
              <p className="ed-step__text">
                {editions.length} monthly editions, from {editionDate(editions[editions.length - 1])} to {editionDate(latestEdition)}.
              </p>
              <Link href="/inflight-magazine" className="ed-more">
                The archive <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
            <Reveal as="li" className="ed-step" delay={80}>
              <p className="ed-step__num" aria-hidden="true">02</p>
              <h3 className="ed-step__title">Read it on the web</h3>
              <p className="ed-step__text">
                {stories.length} stories from {onlineEditions} editions, set word for word, with their photographs.
              </p>
              <Link href="/search" className="ed-more">
                All stories <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
            <Reveal as="li" className="ed-step" delay={160}>
              <p className="ed-step__num" aria-hidden="true">03</p>
              <h3 className="ed-step__title">Open the original edition</h3>
              <p className="ed-step__text">Every story links to the original edition PDF.</p>
              <PdfButton pdfUrl={latestEdition.pdfUrl} title={latestEdition.title} className="ed-more">
                {editionDate(latestEdition)} PDF <span className="ed-more__arrow" aria-hidden="true">↗</span>
              </PdfButton>
            </Reveal>
            <Reveal as="li" className="ed-step" delay={240}>
              <p className="ed-step__num" aria-hidden="true">04</p>
              <h3 className="ed-step__title">Share your story</h3>
              <p className="ed-step__text">Writers, photographers and brands can reach the Spice Route team.</p>
              <Link href="/contact" className="ed-more">
                Get in touch <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
          </ol>
        </div>
      </section>

      {/* 11. RECENT EDITIONS — a shelf of covers */}
      <section id="editions" className="ed-section ed-section--tint" aria-labelledby="editions-title">
        <div className="container">
          <SectionHead
            id="editions-title"
            kicker="Inflight archive"
            title="Recent editions"
            sub="Read each edition online, or open the original PDF."
            more={{ href: "/inflight-magazine", label: `All ${editions.length} editions` }}
          />
          <Shelf label="Recent editions">
            {shelfEditions.map((edition) => (
              <li key={edition.slug} className="ed-shelf__item">
                <EditionCard edition={edition} sizes="(max-width: 479px) 76vw, 360px" />
              </li>
            ))}
          </Shelf>
        </div>
      </section>

      {/* 12. ABOUT SPICE ROUTE — source copy only */}
      <section id="about" className="ed-section" aria-labelledby="about-title">
        <div className="container">
          <div className="ed-about">
            <Reveal className="ed-about__main">
              <p className="ed-kicker ed-kicker--rule">About</p>
              <h2 id="about-title" className="ed-shead__title">
                About Spice Route
              </h2>
              <p className="ed-about__lede">{siteConfig.spiceRoute.about[0]}</p>
              <div className="ed-prose">
                {siteConfig.spiceRoute.about.slice(1).map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
                <p>{siteConfig.spiceJet.overview}</p>
              </div>
              <Link href="/about" className="ed-more ed-about__more">
                About us
                <span className="ed-more__arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </Reveal>

            {/* Verbatim; written in the third person, so not set as a quote */}
            <Reveal delay={90} as="section" className="ed-about__note">
              <h3 className="ed-kicker ed-kicker--red">CEO&apos;s Note</h3>
              {siteConfig.publisher.ceo.note.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="ed-about__notetext">
                  {paragraph}
                </p>
              ))}
              <div className="ed-byline">
                <p className="ed-byline__name">{siteConfig.publisher.ceo.name}</p>
                <p className="ed-byline__role">{siteConfig.publisher.ceo.role}</p>
              </div>
            </Reveal>
          </div>

          {/* The four pillars from the source homepage */}
          <ol className="ed-pillars" aria-label="Spice Route and SpiceJet">
            {siteConfig.pillars.map((pillar, i) => (
              <Reveal as="li" key={pillar.title} delay={i * 60} className="ed-pillar">
                <p className="ed-pillar__num" aria-hidden="true">
                  {pad(i + 1)}
                </p>
                <h3 className="ed-pillar__title">{pillar.title}</h3>
                <p className="ed-pillar__text">{pillar.description}</p>
              </Reveal>
            ))}
          </ol>

          <div className="ed-numbers">
            <Reveal className="ed-numbers__head">
              <h3 className="ed-numbers__title">SpiceJet in Numbers</h3>
              <p className="ed-numbers__text">{siteConfig.spiceJet.regional}</p>
            </Reveal>
            <StatsSection />
          </div>
        </div>
      </section>

      {/* 13. MEDIA PARTNERS */}
      <PartnerLogos />

      {/* 14. ADVERTISE WITH SPICE ROUTE — source copy */}
      <section id="advertise" className="ed-advert" aria-labelledby="advertise-title">
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
                    Contact Advertising Team
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <a href={siteConfig.spiceJet.mediaKitUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                    Media Kit 2025–26 (PDF) <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
