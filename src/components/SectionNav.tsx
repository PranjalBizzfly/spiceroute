import Link from "next/link";
import { categoryHref } from "@/lib/urls";
import { getEditionStories, getLatestEdition } from "@/lib/content";
import { storyCategories } from "@/lib/search";

/** How many of the current issue's stories the strip lists. */
const IN_THIS_ISSUE = 7;

/**
 * Newspaper section navigation under the masthead: every subject on the site,
 * then a strip of what is in the current issue. Both scroll sideways on
 * narrow screens; neither repeats the header's own links.
 */
export default function SectionNav() {
  const categories = storyCategories();
  const latest = getLatestEdition();
  const issue = getEditionStories(latest.slug).slice(0, IN_THIS_ISSUE);

  return (
    <nav className="ed-secnav" aria-label="Sections">
      <div className="container ed-secnav__inner">
        <ul className="ed-secnav__list">
          <li>
            <Link href="/search" className="ed-secnav__link ed-secnav__link--all">
              All stories
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={categoryHref(c.id)} className="ed-secnav__link">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {issue.length > 0 && (
        <div className="ed-secnav__strip">
          <div className="container ed-secnav__inner">
            <p className="ed-secnav__label">
              <Link href={`/inflight-magazine/${latest.slug}`}>
                In this issue
              </Link>
            </p>
            <ul className="ed-secnav__list ed-secnav__list--topics">
              {issue.map((s) => (
                <li key={s.slug}>
                  <Link href={s.href} className="ed-secnav__topic">
                    {s.label ?? s.printedTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
