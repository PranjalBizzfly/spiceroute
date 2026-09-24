import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { editionDate, editionHref } from "@/lib/content";
import PlatePhoto from "@/components/PlatePhoto";
import { categoryBySlug, search, storyCategories } from "@/lib/search";
import { categoryHref, legacyCategorySlug } from "@/lib/urls";
import { permanentRedirect } from "next/navigation";

const description = "Search every Spice Route story and edition: headlines, article text, sections, authors, months and issues.";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const category = typeof sp.category === "string" ? categoryBySlug.get(sp.category) : undefined;
  const title = q ? `“${q.slice(0, 60)}” — Search Spice Route` : category ? `${category.name} — Spice Route stories` : "Search Spice Route";
  return {
    title,
    description,
    alternates: { canonical: "/search" },
    // result pages are views of the same stories; keep them out of the index
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const requested = typeof sp.category === "string" ? sp.category : undefined;
  // an earlier category address (e.g. ?category=travel) means the same category
  const categorySlug = requested && !categoryBySlug.has(requested) ? legacyCategorySlug(requested) ?? requested : requested;
  // a category without a search term is its own page: /stories/<category>
  if (categorySlug && !q.trim() && categoryBySlug.has(categorySlug)) permanentRedirect(categoryHref(categoryBySlug.get(categorySlug)!.id));
  const results = search(q, categorySlug);
  const cats = storyCategories();
  const hasQuery = results.query.length > 0;
  const total = results.stories.length + results.editions.length + results.categories.length;

  const heading = hasQuery ? "Search results" : results.category ? results.category.name : "All stories";
  // with a search term the buttons filter the results; without one they go to
  // the category pages
  const chipHref = (slug?: string) => {
    if (!results.query && slug) return categoryHref(categoryBySlug.get(slug)!.id);
    const p = new URLSearchParams();
    if (results.query) p.set("q", results.query);
    if (slug) p.set("category", slug);
    const s = p.toString();
    return s ? `/search?${s}` : "/search";
  };

  return (
    <div className="ed-page ed-searchpage">
      <section className="ed-issue__hero ed-pagehero ed-scope-dark" aria-labelledby="search-title">
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li aria-current="page">{results.category && !hasQuery ? results.category.name : "Search"}</li>
            </ol>
          </nav>

          <div className="ed-page__head">
            <p className="ed-kicker">Spice Route · The Inflight Magazine of SpiceJet</p>
            <h1 id="search-title" className="ed-issue__title">
              {heading}
            </h1>
            {results.category && !hasQuery && <p className="ed-shead__sub">{results.category.description}</p>}
          </div>

          <form action="/search" method="get" role="search" className="ed-gsearch" aria-label="Search Spice Route">
            <label htmlFor="gsearch-q" className="visually-hidden">
              Search Spice Route
            </label>
            <input
              id="gsearch-q"
              className="ed-gsearch__input"
              type="search"
              name="q"
              defaultValue={results.query}
              placeholder="Search Spice Route…"
              autoComplete="off"
              maxLength={100}
              autoFocus={!hasQuery && !results.category}
            />
            {results.category && <input type="hidden" name="category" value={results.category.slug} />}
            <button type="submit" className="btn btn-primary ed-gsearch__submit">
              Search
            </button>
          </form>

          <nav className="ed-chips ed-gsearch__cats" aria-label="Filter stories by category">
            <Link href={chipHref()} className="ed-chip" aria-current={!results.category ? "page" : undefined}>
              All stories
            </Link>
            {cats.map((c) => (
              <Link key={c.slug} href={chipHref(c.slug)} className="ed-chip" aria-current={results.category?.slug === c.slug ? "page" : undefined}>
                {c.name} <span className="ed-chip__count">{c.count}</span>
              </Link>
            ))}
          </nav>

          <p className="ed-gsearch__status" role="status">
            {hasQuery
              ? total
                ? `${total} result${total === 1 ? "" : "s"} for “${results.query}”${results.category ? ` in ${results.category.name}` : ""}`
                : `Nothing in Spice Route matches “${results.query}”${results.category ? ` in ${results.category.name}` : ""}.`
              : `${results.stories.length} ${results.stories.length === 1 ? "story" : "stories"}, newest edition first`}
          </p>
        </div>
      </section>

      <div className="container ed-gsearch__results">
        {results.stories.length > 0 && (
          <section aria-labelledby="res-stories" className="ed-gsearch__group">
            <h2 id="res-stories" className="ed-kicker ed-gsearch__head">
              Stories <span className="ed-gsearch__count">{results.stories.length}</span>
            </h2>
            {/* Image cards: the story's own photograph with section, printed
                headline and byline set over it; the whole card is the link */}
            {/* three to a row on wide screens, or four if three would leave one card alone */}
            <ol className="ed-gcards" data-cols={results.stories.length % 3 === 1 && results.stories.length > 3 ? 4 : 3}>
              {results.stories.map(({ story, excerpt, matchedInText }, i) => (
                <li key={story.slug} className="ed-gcards__item">
                  <Link href={story.href} className={`ed-gcard${story.images[0] ? "" : " ed-gcard--noimage"}`}>
                    {story.images[0] && (
                      <PlatePhoto
                        src={story.images[0].src}
                        alt={story.images[0].alt}
                        sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 480px"
                        priority={i < 3}
                        className="ed-gcard__img"
                      />
                    )}
                    <span className="ed-gcard__body">
                      <span className="ed-gcard__kicker">
                        {story.section}
                        {story.label ? ` · ${story.label}` : ""}
                      </span>
                      <span className="ed-gcard__title">{story.printedTitle}</span>
                      <span className="ed-gcard__byline">
                        {story.author ? `By ${story.author} · ` : ""}
                        {editionDate(story.edition)}
                      </span>
                    </span>
                  </Link>
                  {/* where the match is only in the article text, show that printed passage */}
                  {matchedInText && excerpt && <p className="ed-gcards__passage">{excerpt}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {results.editions.length > 0 && (
          <section aria-labelledby="res-editions" className="ed-gsearch__group">
            <h2 id="res-editions" className="ed-kicker ed-gsearch__head">
              Editions <span className="ed-gsearch__count">{results.editions.length}</span>
            </h2>
            <ul className="ed-gsearch__editions">
              {results.editions.map((e) => (
                <li key={e.slug}>
                  <Link href={editionHref(e.slug)} className="ed-gsearch__edition">
                    <span className="ed-gsearch__cover">
                      <Image src={e.cover} alt={`Spice Route ${e.month} ${e.year} cover`} fill sizes="72px" loading="lazy" />
                    </span>
                    <span>
                      <span className="ed-gsearch__title">{editionDate(e)}</span>
                      <span className="ed-gsearch__meta">
                        {e.issue ? `Volume ${e.volume} · Issue ${e.issue}` : e.title}
                        {e.storyIds.length ? ` · ${e.storyIds.length} web ${e.storyIds.length === 1 ? "story" : "stories"}` : " · Full edition as PDF"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.categories.length > 0 && (
          <section aria-labelledby="res-categories" className="ed-gsearch__group">
            <h2 id="res-categories" className="ed-kicker ed-gsearch__head">
              Categories <span className="ed-gsearch__count">{results.categories.length}</span>
            </h2>
            <ul className="ed-gsearch__cats-list">
              {results.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={categoryHref(c.id)} className="ed-gsearch__title">
                    {c.name}
                  </Link>
                  <span className="ed-gsearch__meta">
                    {c.count} {c.count === 1 ? "story" : "stories"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasQuery && total === 0 && (
          <div className="ed-gsearch__empty">
            <p>Try a place, a dish, a person, a month such as “June 2026”, or an issue number.</p>
            <p>
              <Link href="/inflight-magazine">Browse all editions →</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
