import Link from "next/link";
import PlatePhoto from "@/components/PlatePhoto";
import type { StoryEntry } from "@/types";

/**
 * Related stories: photograph-led, from this story's own issue first, then
 * the same printed section or web category in other issues. Only verified
 * stories, each with its printed section, headline and edition.
 */
export function RelatedStories({ stories, title }: { stories: StoryEntry[]; title: string }) {
  if (!stories.length) return null;
  return (
    <section className="ed-story__related ed-relmore" aria-labelledby="related-title">
      <h2 id="related-title" className="ed-relmore__head">
        {title}
      </h2>
      <ul className="ed-relgrid">
        {stories.map((s) => (
          <li key={s.slug} className="ed-rel">
            {s.images[0] && (
              <div className="ed-rel__plate">
                <PlatePhoto src={s.images[0].src} alt="" sizes="(max-width: 559px) 92vw, (max-width: 979px) 44vw, 300px" />
              </div>
            )}
            <p className="ed-rel__section">{s.section}</p>
            <h3 className="ed-rel__title">
              <Link href={s.href}>{s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}</Link>
            </h3>
            <p className="ed-rel__meta">
              {s.edition.month} {s.edition.year}
              {s.author ? ` · ${s.author}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * More from this edition: the rest of the issue in printed order, as compact
 * editorial rows — thumbnail, printed section and headline.
 */
export function MoreFromEdition({
  stories,
  editionHref,
  editionName,
  total,
}: {
  stories: StoryEntry[];
  editionHref: string;
  editionName: string;
  total: number;
}) {
  if (!stories.length) return null;
  return (
    <section className="ed-story__related ed-relmore" aria-labelledby="more-edition-title">
      <div className="ed-relmore__bar">
        <h2 id="more-edition-title" className="ed-relmore__head">
          More from this edition
        </h2>
        <Link href={`${editionHref}#in-this-issue`} className="ed-more">
          All {total} stories in {editionName}
          <span className="ed-more__arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>
      <ul className="ed-rows">
        {stories.map((s) => (
          <li key={s.slug} className="ed-row2">
            {s.images[0] && (
              <div className="ed-row2__thumb">
                <PlatePhoto src={s.images[0].src} alt="" sizes="120px" />
              </div>
            )}
            <div className="ed-row2__body">
              <p className="ed-row2__section">{s.section}</p>
              <h3 className="ed-row2__title">
                <Link href={s.href}>{s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}</Link>
              </h3>
              {s.standfirst && <p className="ed-row2__dek">{s.standfirst}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
