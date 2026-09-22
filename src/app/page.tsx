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
import StoryCard, { categoryLabel } from "@/components/StoryCard";
import StoryIndexList from "@/components/StoryIndexList";
import IssueIndex from "@/components/edition/IssueIndex";
import { editionDate, getEditions, getEditionStories, getLatestEdition } from "@/lib/content";

/* --------------------------------------------------------------------------
   Editorial running order.
   Every story below comes from the verified inventory in src/data/stories.ts —
   nothing is invented, and each story is placed exactly once. pick() skips a
   slug that no longer exists, and anything left over is still published in the
   closing index, so no verified story can silently drop off the page.
   -------------------------------------------------------------------------- */

// The current issue's lead story, beside its cover. If it is missing, the
// issue's first story after the Chairman's letter leads instead.
const LEAD = ["kolkata-forever-day-in-a-city"];

const FEATURED = [
  "five-monsoon-escapes-rain-kissed-splendour",
  "ranveer-brar-conversation",
  "ladakh-roof-of-the-world",
];

// The closing "More stories" list stays short; the rest are in the archive
const MORE_LIMIT = 6;

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
  // The current issue, in printed order: its contents lead the page
  const issueStories = getEditionStories(latestEdition.slug);
  // Earlier issues only — the current one already leads the page
  const earlierEditions = editions.slice(1, 5);

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

  const fallbackLead = issueStories.find((s) => s.section !== "Welcome Aboard");
  const leadStory = pick(LEAD)[0] ?? (fallbackLead ? pick([fallbackLead.slug])[0] : undefined);
  const featuredStories = pick(FEATURED);
  const travelStories = pick(TRAVEL);
  const foodStories = pick(FOOD);
  const cultureStories = pick(CULTURE);
  // Every current-issue story is listed in "Explore this issue"
  issueStories.forEach((s) => used.add(s.slug));
  const remainingStories = stories.filter((story) => !used.has(story.slug));
  const moreStories = remainingStories.slice(0, MORE_LIMIT);

  const [featureLead, ...featureSupport] = featuredStories;
  const [travelLead, ...travelRest] = travelStories;
  const [cultureLead, ...cultureRest] = cultureStories;

  const latestHref = `/inflight-magazine/${latestEdition.slug}`;

  return (
    <>
      {/* ================================================================
          1. HERO — recreated from the spiceroutemagazine.in homepage: the red
          band, "A Publication by" NKN Media, its headline, standfirst and
          "Publish Your Story" CTA beside the covers-and-aircraft artwork
          ================================================================ */}
      <section className="ed-shero ed-shero--home" aria-labelledby="hero-title">
        <div className="ed-shero__inner">
          <div className="ed-shero__text">
            <p className="ed-shero__kicker ed-rise">A Publication by</p>
            <Image
              src="/images/hero/nkn-media-logo.webp"
              alt={siteConfig.publisher.name}
              width={469}
              height={328}
              className="ed-shero__logo ed-rise"
              style={delay(30)}
              sizes="110px"
              priority
            />
            <h1 id="hero-title" className="ed-shero__title ed-rise" style={delay(60)}>
              Discover stories, destinations, and inspiration with SpiceRoute
            </h1>
            <p className="ed-shero__lede ed-rise" style={delay(90)}>
              {siteConfig.description}
            </p>
            <Link href="/contact" className="ed-shero__btn ed-rise" style={delay(120)}>
              Publish Your Story
            </Link>
          </div>

          <div className="ed-shero__media ed-rise" style={delay(80)}>
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
      </section>

      {/* ================================================================
          2. CURRENT ISSUE — the front door: this month's cover, its facts and
          its lead story
          ================================================================ */}
      <section id="current-issue" className="ed-section ed-issuefront" aria-labelledby="current-issue-title">
        <div className="container ed-issuefront__grid">
          <Reveal className="ed-issuefront__issue">
            <Link href={latestHref} className="ed-issuefront__cover" tabIndex={-1} aria-hidden="true">
              <Image
                src={latestEdition.cover}
                alt=""
                fill
                sizes="(max-width: 559px) 40vw, 300px"
                priority
              />
            </Link>
            <div className="ed-issuefront__meta">
              <p className="ed-kicker ed-kicker--red">Current issue</p>
              <h2 id="current-issue-title" className="ed-issuefront__title">
                <Link href={latestHref}>{editionDate(latestEdition)}</Link>
              </h2>
              <p className="ed-issuefront__facts">
                {latestEdition.issue ? `Volume ${latestEdition.volume} · Issue ${latestEdition.issue}` : latestEdition.title}
                {latestEdition.pageCount ? ` · ${latestEdition.pageCount} pages in print` : ""}
              </p>
              <p className="ed-edition__kind is-web">
                {issueStories.length} {issueStories.length === 1 ? "story" : "stories"} to read on the web
              </p>
              <div className="ed-actions">
                <Link href={latestHref} className="btn btn-primary">
                  Read this issue <span aria-hidden="true">&rarr;</span>
                </Link>
                <PdfButton pdfUrl={latestEdition.pdfUrl} title={latestEdition.title} className="ed-more ed-issue__pdf">
                  Original PDF <span aria-hidden="true">↗</span>
                </PdfButton>
              </div>
            </div>
          </Reveal>

          {leadStory && (
            <Reveal className="ed-issuefront__lead" delay={80}>
              <StoryCard
                story={leadStory}
                variant="featured"
                headingLevel="h3"
                stacked
                priority
                sizes="(max-width: 999px) 92vw, 700px"
              />
            </Reveal>
          )}
        </div>
      </section>

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
          4. EXPLORE THIS ISSUE — its contents page, in printed order
          ================================================================ */}
      {issueStories.length > 0 && (
        <section id="latest" className="ed-section" aria-labelledby="explore-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker ed-kicker--red">
                    {latestEdition.issue ? `Issue ${latestEdition.issue} · ` : ""}
                    {editionDate(latestEdition)}
                  </p>
                  <h2 id="explore-title" className="ed-shead__title">
                    Explore this issue
                  </h2>
                  <p className="ed-shead__sub">Every story from the issue, in printed order, with its page in print.</p>
                </div>
                <Link href={`${latestHref}#in-this-issue`} className="ed-more">
                  Full contents
                  <span className="ed-more__arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              </div>
            </Reveal>
            <Reveal>
              <IssueIndex stories={issueStories} />
            </Reveal>
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
          8. MORE STORIES — a short index from earlier issues; the rest are
          listed in the archive
          ================================================================ */}
      {moreStories.length > 0 && (
        <section className="ed-section ed-section--rule" aria-labelledby="more-title">
          <div className="container">
            <Reveal>
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker ed-kicker--red">From earlier issues</p>
                  <h2 id="more-title" className="ed-shead__title">
                    More stories
                  </h2>
                </div>
                <Link href="/search" className="ed-more">
                  All stories
                  <span className="ed-more__arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              </div>
            </Reveal>
            <Reveal>
              <StoryIndexList stories={moreStories} withThumbs />
            </Reveal>
          </div>
        </section>
      )}

      {/* ================================================================
          9. RECENT EDITIONS — the issues before the current one
          ================================================================ */}
      <section id="editions" className="ed-section ed-section--tint" aria-labelledby="editions-title">
        <div className="container">
          <Reveal>
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

          <div className="ed-editions">
            {earlierEditions.map((edition, i) => (
              <Reveal key={edition.slug} delay={i * 70}>
                <EditionCard edition={edition} sizes="(max-width: 479px) 60vw, (max-width: 819px) 45vw, 290px" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

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
