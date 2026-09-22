import PlatePhoto from "@/components/PlatePhoto";
import Link from "next/link";
import type { EditionRef, StoryRef } from "@/types";

interface StoryPagerProps {
  previous?: StoryRef;
  next?: StoryRef;
  edition: EditionRef;
}

/** Previous / next story in the edition's printed reading order. */
export default function StoryPager({ previous, next, edition }: StoryPagerProps) {
  const editionLink = `/inflight-magazine/${edition.slug}`;
  const card = (s: StoryRef, dir: "prev" | "next") => (
    <Link href={s.href} className={`ed-pager__link ed-pager__link--${dir} ed-pager__link--story`} rel={dir}>
      {dir === "prev" && s.image && (
        <span className="ed-pager__thumb ed-pager__thumb--story">
          <PlatePhoto src={s.image} alt="" sizes="80px" />
        </span>
      )}
      <span className="ed-pager__text">
        <span className="ed-pager__dir">
          {dir === "prev" ? (
            <>
              <span aria-hidden="true">&larr; </span>Previous story
            </>
          ) : (
            <>
              Next story<span aria-hidden="true"> &rarr;</span>
            </>
          )}
        </span>
        {s.section.toLowerCase() !== s.printedTitle.toLowerCase() && (
          <span className="ed-pager__section">{s.section}</span>
        )}
        <span className="ed-pager__title">
          {s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}
        </span>
      </span>
      {dir === "next" && s.image && (
        <span className="ed-pager__thumb ed-pager__thumb--story">
          <PlatePhoto src={s.image} alt="" sizes="80px" />
        </span>
      )}
    </Link>
  );

  return (
    <nav className="ed-pager ed-pager--story" aria-label="Story navigation">
      {previous ? (
        card(previous, "prev")
      ) : (
        <Link href={editionLink} className="ed-pager__link ed-pager__link--prev ed-pager__link--plain">
          <span className="ed-pager__text">
            <span className="ed-pager__dir">
              <span aria-hidden="true">&larr; </span>Edition contents
            </span>
            <span className="ed-pager__title">
              {edition.month} {edition.year}
            </span>
          </span>
        </Link>
      )}
      {next ? (
        card(next, "next")
      ) : (
        <Link href={editionLink} className="ed-pager__link ed-pager__link--next ed-pager__link--plain">
          <span className="ed-pager__text">
            <span className="ed-pager__dir">
              Edition contents<span aria-hidden="true"> &rarr;</span>
            </span>
            <span className="ed-pager__title">
              {edition.month} {edition.year}
            </span>
          </span>
        </Link>
      )}
    </nav>
  );
}
