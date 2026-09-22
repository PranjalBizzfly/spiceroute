import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { editionDate, editionHref } from "@/lib/content";
import { imageFocus } from "@/lib/imageFocus";
import { categoryBySlug, search, storyCategories } from "@/lib/search";

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
  const categorySlug = typeof sp.category === "string" ? sp.category : undefined;
  const results = search(q, categorySlug);
  const cats = storyCategories();
  const hasQuery = results.query.length > 0;
  const total = results.stories.length + results.editions.length + results.categories.length;

  const heading = hasQuery ? "Search results" : results.category ? results.category.name : "All stories";
  const chipHref = (slug?: string) => {
    const p = new URLSearchParams();
    if (results.query) p.set("q", results.query);
    if (slug) p.set("category", slug);
    const s = p.toString();
    return s ? `/search?${s}` : "/search";
  };

  return (
    <div className="ed-page ed-searchpage">
      <section className="ed-issue__hero" aria-labelledby="search-title">
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
            <ol className="ed-gsearch__list">
              {results.stories.map(({ story, category, excerpt, matchedInText }) => (
                <li key={story.slug} className="ed-gsearch__item">
                  <div className="ed-gsearch__text">
                    <p className="ed-gsearch__kicker">
                      {story.section}
                      {story.label ? ` · ${story.label}` : ""}
                    </p>
                    <h3 className="ed-gsearch__title">
                      <Link href={story.href}>{story.printedTitle}</Link>
                    </h3>
                    {excerpt && (
                      <p className={`ed-gsearch__excerpt${matchedInText ? " is-passage" : ""}`}>
                        {excerpt}
                      </p>
                    )}
                    <p className="ed-gsearch__meta">
                      {story.author && <span>{story.author}</span>}
                      <span>
                        <Link href={editionHref(story.edition.slug)}>{editionDate(story.edition)} edition</Link>
                      </span>
                      {category && <span>{category.name}</span>}
                      <Link href={story.href} className="ed-gsearch__read" aria-hidden="true" tabIndex={-1}>
                        Read story →
                      </Link>
                    </p>
                  </div>
                  {story.images[0] && (
                    <Link href={story.href} className="ed-gsearch__thumb" tabIndex={-1} aria-hidden="true">
                      <Image
                        src={story.images[0].src}
                        alt=""
                        fill
                        sizes="(max-width: 639px) 84px, 132px"
                        loading="lazy"
                        style={{ objectPosition: imageFocus(story.images[0].src) }}
                      />
                    </Link>
                  )}
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
                      <Image src={e.cover} alt="" fill sizes="72px" loading="lazy" />
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
                  <Link href={`/search?category=${c.slug}`} className="ed-gsearch__title">
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
