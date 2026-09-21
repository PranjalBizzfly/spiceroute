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
import { editionDate, getEdition, getEditions, getLatestEdition } from "@/lib/content";
import { imageFocus } from "@/lib/imageFocus";

/* --------------------------------------------------------------------------
   Editorial running order.
   Every story below comes from the verified inventory in src/data/stories.ts —
   nothing is invented, and each story is placed exactly once. pick() skips a
   slug that no longer exists, and anything left over is still published in the
   closing index, so no verified story can silently drop off the page.
   -------------------------------------------------------------------------- */

// Opens the page: the lead photograph of the current issue
const LEAD = ["kolkata-forever-day-in-a-city"];

// The Chairman's letter that opens the current issue (PDF page 4)
const LETTER = ["welcome-aboard-september-2026"];

const FEATURED = [
  "five-monsoon-escapes-rain-kissed-splendour",
  "ranveer-brar-conversation",
  "ladakh-roof-of-the-world",
];

const LATEST = [
  "saving-the-greater-one-horned-rhino",
  "sweet-devotion-modak-traditions",
  "my-hometown-gwalior",
];

// Lead first, then the four places
const TRAVEL = [
  "varanasi-the-eternal-city",
  "sittong-orange-valley-hills",
  "day-in-a-city-pune",
  "my-hometown-wayanad",
  "my-hometown-jaipur",
];

const FOOD = [
  "from-estate-to-espresso",
  "global-flavours-take-off",
  "japanese-desserts-india",
];

const CULTURE = [
  "icons-of-new-india",
  "kitchen-healing-traditional-superfoods",
  "live-long-travel-longer",
  "fur-all-pet-yoga",
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const delay = (ms: number) => ({ "--rise-delay": ms }) as React.CSSProperties;

export default function HomePage() {
  const editions = getEditions();
  const latestEdition = getLatestEdition();
  const [shelfLead, ...shelfRest] = editions.slice(0, 4);

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

  const leadStory = pick(LEAD)[0] ?? stories[0];
  if (leadStory) used.add(leadStory.slug);
  const leadEdition = leadStory ? getEdition(leadStory.editionSlug) : undefined;

  const [letter] = pick(LETTER);
  const featuredStories = pick(FEATURED);
  const latestStories = pick(LATEST);
  const travelStories = pick(TRAVEL);
  const foodStories = pick(FOOD);
  const cultureStories = pick(CULTURE);
  const remainingStories = stories.filter((story) => !used.has(story.slug));

  const [featureLead, ...featureSupport] = featuredStories;
  const [travelLead, ...travelRest] = travelStories;
  const [cultureLead, ...cultureRest] = cultureStories;

  const latestHref = `/inflight-magazine/${latestEdition.slug}`;

  return (
    <>
      {/* ================================================================
          1. FRONT PAGE — the current issue's lead photograph
          ================================================================ */}
      <section className="ed-front" aria-labelledby="hero-title">
        <div className="container ed-front__grid">
          <div className="ed-front__text">
            {/* Source homepage: "A Publication by" NKN Media */}
            <p className="ed-kicker ed-rise">A Publication by {siteConfig.publisher.name}</p>

            <h1 id="hero-title" className="ed-hero__title ed-rise" style={delay(40)}>
              Discover stories, destinations, and inspiration with <em>SpiceRoute</em>
            </h1>

            <p className="ed-hero__lede ed-rise" style={delay(80)}>
              {siteConfig.description}
            </p>

            <div className="ed-hero__actions ed-rise" style={delay(120)}>
              <Link href={latestHref} className="btn btn-primary">
                Read the {latestEdition.month} {latestEdition.year} issue
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link href="/inflight-magazine" className="btn btn-outline">
                Browse all {editions.length} editions
              </Link>
              {/* Source homepage CTA */}
              <Link href="/contact" className="ed-more ed-hero__publish">
                Publish Your Story
                <span className="ed-more__arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </div>

            {/* Figures from the source homepage copy */}
            <dl className="ed-hero__facts ed-rise" style={delay(160)}>
              <div className="ed-fact">
                <dt className="ed-fact__label">Monthly passengers</dt>
                <dd className="ed-fact__value">1M+</dd>
              </div>
              <div className="ed-fact">
                <dt className="ed-fact__label">Destinations</dt>
                <dd className="ed-fact__value ed-fact__value--gold">63</dd>
              </div>
              <div className="ed-fact">
                <dt className="ed-fact__label">Years of excellence</dt>
                <dd className="ed-fact__value">17</dd>
              </div>
              {latestEdition.issue && (
                <div className="ed-fact">
                  <dt className="ed-fact__label">Current issue</dt>
                  <dd className="ed-fact__value ed-fact__value--gold">No. {latestEdition.issue}</dd>
                </div>
              )}
            </dl>
          </div>

          {leadStory?.heroImage && (
            <figure className="ed-front__media">
              <div className="ed-front__photo">
                <Image
                  src={leadStory.heroImage}
                  alt={leadStory.heroImageAlt ?? ""}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 1023px) 100vw, 720px"
                  style={{ objectPosition: imageFocus(leadStory.heroImage) }}
                />
              </div>

              <figcaption className="ed-front__caption">
                <p className="ed-card__cat">
                  {storyKicker(leadStory) ?? categoryLabel(leadStory.category)}
                  {leadEdition ? ` · ${leadEdition.month} ${leadEdition.year}` : ""}
                </p>
                <h2 className="ed-front__story">
                  {/* One link; it stretches over the photograph */}
                  <Link href={`/stories/${leadStory.category}/${leadStory.slug}`} className="ed-front__storylink">
                    {leadStory.title}
                  </Link>
                </h2>
                <p className="ed-front__standfirst">{leadStory.excerpt}</p>
                {leadStory.author && (
                  <p className="ed-card__meta">
                    <span className="ed-card__author">{leadStory.author}</span>
                  </p>
                )}
              </figcaption>

              {/* The printed cover of the current issue, tucked onto the photograph */}
              <Link href={latestHref} className="ed-front__issue">
                <span className="ed-front__issuecover">
                  <Image
                    src={latestEdition.cover}
                    alt={`Cover of ${latestEdition.title}`}
                    fill
                    loading="eager"
                    sizes="150px"
                  />
                </span>
                <span className="ed-front__issuetext">
                  {latestEdition.issue ? `Issue ${latestEdition.issue}` : "Current issue"}
                  <span>
                    {latestEdition.month} {latestEdition.year}
                  </span>
                </span>
              </Link>
            </figure>
          )}
        </div>
      </section>

      {/* ================================================================
          1b. WELCOME ABOARD — the Chairman's letter that opens the issue
          ================================================================ */}
      {letter && (
        <section className="ed-section ed-section--tight ed-section--rule" aria-label="Welcome Aboard">
          <div className="container">
            <Reveal>
              <div className="ed-letter">
                <StoryCard
                  story={letter}
                  variant="horizontal"
                  withImage
                  headingLevel="h2"
                  sizes="(max-width: 559px) 112px, 168px"
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ================================================================
          2. FEATURED — one dominant feature, a conversation, a photo essay
          ================================================================ */}
      {featureLead && (
        <section id="featured" className="ed-section ed-section--tint" aria-labelledby="featured-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker">
                    {latestEdition.issue ? `Issue ${latestEdition.issue} · ` : ""}
                    {latestEdition.month} {latestEdition.year}
                  </p>
                  <h2 id="featured-title" className="ed-shead__title">
                    Featured stories
                  </h2>
                </div>
                <Link href={latestHref} className="ed-more">
                  View the full issue
                  <span className="ed-more__arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              </div>
            </Reveal>

            <div className="ed-featured">
              <Reveal className="ed-featured__lead">
                <StoryCard
                  story={featureLead}
                  variant="featured"
                  showEdition
                  stacked
                  sizes="(max-width: 999px) 92vw, 740px"
                />
              </Reveal>

              {featureSupport.map((story, i) => (
                <Reveal
                  key={story.slug}
                  delay={80 + i * 80}
                  className={story.category === "interviews" ? "ed-featured__quote" : "ed-featured__side"}
                >
                  {/* A conversation carries its printed pull quote */}
                  <StoryCard
                    story={story}
                    variant={story.category === "interviews" ? "quote" : "standard"}
                    withImage
                    showEdition={story.category !== "interviews"}
                    sizes={
                      story.category === "interviews"
                        ? "(max-width: 559px) 40vw, 200px"
                        : "(max-width: 999px) 92vw, 500px"
                    }
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          3. LATEST — a ruled, numbered strip
          ================================================================ */}
      {latestStories.length > 0 && (
        <section id="latest" className="ed-section" aria-labelledby="latest-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker ed-kicker--red">{latestEdition.title}</p>
                  <h2 id="latest-title" className="ed-shead__title">
                    Latest stories
                  </h2>
                </div>
              </div>
            </Reveal>

            <ol className="ed-strip">
              {latestStories.map((story, i) => (
                <Reveal as="li" key={story.slug} delay={i * 80} className="ed-strip__item">
                  <StoryCard
                    story={story}
                    variant="standard"
                    showEdition
                    sizes={
                      i === 0
                        ? "(max-width: 699px) 104px, (max-width: 1099px) 40vw, 520px"
                        : "(max-width: 699px) 104px, (max-width: 1099px) 30vw, 380px"
                    }
                  />
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ================================================================
          4. TRAVEL & DESTINATIONS — a place atlas: four places, one long read
          ================================================================ */}
      {travelLead && (
        <section id="travel" className="ed-section ed-section--tint" aria-labelledby="travel-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker">
                    {categoryLabel("travel")} · {categoryLabel("destinations")}
                  </p>
                  <h2 id="travel-title" className="ed-shead__title">
                    Travel &amp; Destinations
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="ed-atlas">
              <ul className="ed-atlas__places">
                {travelRest.map((story, i) => (
                  <Reveal as="li" key={story.slug} delay={i * 70}>
                    <StoryCard
                      story={story}
                      variant="standard"
                      className="ed-card--place"
                      sizes="(max-width: 559px) 92vw, (max-width: 899px) 45vw, 330px"
                    />
                  </Reveal>
                ))}
              </ul>

              <Reveal className="ed-atlas__lead" delay={60}>
                <StoryCard
                  story={travelLead}
                  variant="featured"
                  headingLevel="h3"
                  showEdition
                  stacked
                  className="ed-card--tall"
                  sizes="(max-width: 899px) 92vw, 540px"
                />
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          5. FOOD — a light "paper" spread: three plates side by side
          ================================================================ */}
      {foodStories.length > 0 && (
        <section id="cuisine" className="ed-section ed-section--paper" aria-labelledby="food-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead ed-shead--center">
                <div className="ed-shead__main">
                  <p className="ed-kicker">{categoryLabel("cuisine")}</p>
                  <h2 id="food-title" className="ed-shead__title">
                    Food &amp; Flavours
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="ed-triptych">
              {foodStories.map((story, i) => (
                <Reveal key={story.slug} delay={i * 90}>
                  <StoryCard
                    story={story}
                    variant="standard"
                    showEdition
                    sizes="(max-width: 639px) 92vw, (max-width: 1099px) 31vw, 380px"
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          6. CULTURE & WELLNESS — a contents column beside the lead feature
          ================================================================ */}
      {cultureLead && (
        <section id="culture" className="ed-section" aria-labelledby="culture-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker">
                    {categoryLabel("culture")} · {categoryLabel("wellness")}
                  </p>
                  <h2 id="culture-title" className="ed-shead__title">
                    Culture &amp; Wellness
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="ed-spread">
              <Reveal>
                <StoryCard
                  story={cultureLead}
                  variant="featured"
                  showEdition
                  stacked
                  sizes="(max-width: 999px) 92vw, 700px"
                />
              </Reveal>

              <Reveal delay={90}>
                <StoryIndexList stories={cultureRest} startIndex={2} withThumbs />
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          7. RECENT EDITIONS — the latest cover leads, three before it
          ================================================================ */}
      <section id="editions" className="ed-section ed-section--tint" aria-labelledby="editions-title">
        <div className="container ed-shelf">
          <Reveal className="ed-shelf__head">
            <div className="ed-shead">
              <div className="ed-shead__main">
                <p className="ed-kicker">Inflight archive</p>
                <h2 id="editions-title" className="ed-shead__title">
                  Recent editions
                </h2>
                <p className="ed-shead__sub">Read each edition online, or open the original PDF.</p>
              </div>
              <Link href="/inflight-magazine" className="ed-more">
                All {editions.length} editions
                <span className="ed-more__arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </div>
          </Reveal>

          {shelfLead && (
            <Reveal className="ed-shelf__lead">
              <article className="ed-shelf__issue" aria-labelledby="shelf-lead-title">
                <Link
                  href={`/inflight-magazine/${shelfLead.slug}`}
                  className="ed-shelf__cover"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image
                    src={shelfLead.cover}
                    alt=""
                    fill
                    sizes="(max-width: 819px) 72vw, 420px"
                    loading="lazy"
                  />
                </Link>
                <div className="ed-shelf__meta">
                  <p className="ed-kicker ed-kicker--red">Latest edition</p>
                  <h3 id="shelf-lead-title" className="ed-shelf__title">
                    <Link href={`/inflight-magazine/${shelfLead.slug}`}>{editionDate(shelfLead)}</Link>
                  </h3>
                  <p className="ed-shelf__facts">
                    {shelfLead.issue ? `Volume ${shelfLead.volume} · Issue ${shelfLead.issue}` : shelfLead.title}
                    {shelfLead.pageCount ? ` · ${shelfLead.pageCount} pages in print` : ""}
                  </p>
                  <p className="ed-edition__kind is-web">
                    {shelfLead.pdfOnly
                      ? "Full edition available as PDF"
                      : `${shelfLead.storyIds.length} ${shelfLead.storyIds.length === 1 ? "story" : "stories"} to read on the web`}
                  </p>
                  <div className="ed-actions">
                    <Link href={`/inflight-magazine/${shelfLead.slug}`} className="btn btn-primary">
                      {shelfLead.pdfOnly ? "Open edition" : "Read Online"} <span aria-hidden="true">&rarr;</span>
                    </Link>
                    <PdfButton pdfUrl={shelfLead.pdfUrl} title={shelfLead.title} className="ed-more ed-issue__pdf">
                      View Original PDF <span aria-hidden="true">↗</span>
                    </PdfButton>
                  </div>
                </div>
              </article>
            </Reveal>
          )}

          <div className="ed-shelf__rest ed-editions">
            {shelfRest.map((edition, i) => (
              <Reveal key={edition.slug} delay={i * 70}>
                <EditionCard edition={edition} sizes="(max-width: 479px) 60vw, (max-width: 819px) 30vw, 220px" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          8. MORE FROM THE ARCHIVE — safety net for unplaced stories
          ================================================================ */}
      {remainingStories.length > 0 && (
        <section className="ed-section" aria-labelledby="more-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker ed-kicker--red">Also in this archive</p>
                  <h2 id="more-title" className="ed-shead__title">
                    More Spice Route stories
                  </h2>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <StoryIndexList stories={remainingStories} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ================================================================
          9. ABOUT SPICE ROUTE — source copy only
          ================================================================ */}
      <section id="about" className="ed-section" aria-labelledby="about-title">
        <div className="container">
          <div className="ed-about">
            <Reveal className="ed-about__main">
              <p className="ed-kicker">About</p>
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
                  {String(i + 1).padStart(2, "0")}
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

      {/* ================================================================
          10. MEDIA PARTNERS
          ================================================================ */}
      <PartnerLogos />

      {/* ================================================================
          11. ADVERTISE WITH SPICE ROUTE — source copy
          ================================================================ */}
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
    </>
  );
}
