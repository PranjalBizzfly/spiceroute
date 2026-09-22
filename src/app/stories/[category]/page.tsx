import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlatePhoto from "@/components/PlatePhoto";
import { editionDate } from "@/lib/content";
import { categoryBySlug, search, storyCategories } from "@/lib/search";
import { categoryHref } from "@/lib/urls";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ category: string }>;
}

/** One page per story category: /stories/<category slug> */
export async function generateStaticParams() {
  return storyCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryBySlug.get(slug);
  if (!category) return { title: "Category Not Found" };
  const path = categoryHref(category.id);
  const title = `${category.name} | Spice Route Stories`;
  return {
    title,
    description: category.description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title: category.name, description: category.description, siteName: "Spice Route Magazine" },
    twitter: { card: "summary", title: category.name, description: category.description },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const category = categoryBySlug.get(slug);
  if (!category) notFound();

  // the category's stories, newest edition first (as on /search)
  const { stories } = search("", slug);
  const cats = storyCategories();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      ["Home", SITE_URL],
      ["Stories", `${SITE_URL}/search`],
      [category.name, `${SITE_URL}${categoryHref(category.id)}`],
    ].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };

  return (
    <div className="ed-page ed-searchpage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />
      <section className="ed-issue__hero ed-pagehero ed-scope-dark" aria-labelledby="category-title">
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/search">Stories</Link></li>
              <li aria-current="page">{category.name}</li>
            </ol>
          </nav>

          <div className="ed-page__head">
            <p className="ed-kicker">Spice Route · Stories</p>
            <h1 id="category-title" className="ed-issue__title">
              {category.name}
            </h1>
            <p className="ed-shead__sub">{category.description}</p>
          </div>

          <nav className="ed-chips ed-gsearch__cats" aria-label="Story categories">
            <Link href="/search" className="ed-chip">
              All stories
            </Link>
            {cats.map((c) => (
              <Link key={c.slug} href={categoryHref(c.id)} className="ed-chip" aria-current={c.slug === slug ? "page" : undefined}>
                {c.name} <span className="ed-chip__count">{c.count}</span>
              </Link>
            ))}
          </nav>

          <p className="ed-gsearch__status">
            {stories.length} {stories.length === 1 ? "story" : "stories"}, newest edition first
          </p>
        </div>
      </section>

      <div className="container ed-gsearch__results">
        <section aria-labelledby="category-stories" className="ed-gsearch__group">
          <h2 id="category-stories" className="ed-kicker ed-gsearch__head">
            Stories <span className="ed-gsearch__count">{stories.length}</span>
          </h2>
          <ol className="ed-gcards" data-cols={stories.length % 3 === 1 && stories.length > 3 ? 4 : 3}>
            {stories.map(({ story }, i) => (
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
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
