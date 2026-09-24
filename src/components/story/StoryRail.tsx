import Image from "next/image";
import Link from "next/link";
import SourceStrip from "@/components/story/SourceStrip";
import PlatePhoto from "@/components/PlatePhoto";
import type { EditionEntry, StoryEntry } from "@/types";

interface StoryRailProps {
  story: StoryEntry;
  edition: EditionEntry;
  /** The whole issue, in printed order. */
  issue: StoryEntry[];
  /** Further stories in the same printed section, not set out below. */
  more?: StoryEntry[];
  /** What that section is called. */
  moreTitle?: string;
}

/** How many of the issue's following stories the rail lists. */
const UP_NEXT = 5;

/**
 * The article's side column: the print edition with its original PDF, what
 * follows in the same issue, then more of the same printed section — all
 * navigation, no story text of its own, and every line of it from the
 * verified editions and stories.
 */
export default function StoryRail({ story, edition, issue, more = [], moreTitle }: StoryRailProps) {
  const at = issue.findIndex((s) => s.slug === story.slug);
  // the stories printed after this one, then wrapping to the front of the issue
  const after = [...issue.slice(at + 1), ...issue.slice(0, Math.max(0, at))].slice(0, UP_NEXT);

  return (
    <aside className="ed-news__rail" aria-label="This story's edition">
      <div className="ed-news__stack">
        <section className="ed-news__box ed-news__print" aria-labelledby="rail-print-title">
          <Link href={`/inflight-magazine/${edition.slug}`} className="ed-news__printcover" tabIndex={-1} aria-hidden="true">
            <Image src={edition.cover} alt={`Spice Route ${edition.month} ${edition.year} cover`} fill sizes="128px" loading="lazy" />
          </Link>
          <div className="ed-news__printbody">
            <p className="ed-news__boxkicker" id="rail-print-title">
              This edition
            </p>
            {edition.volume !== undefined && (
              <p className="ed-news__vol">Volume {edition.volume}</p>
            )}
            {/* the print source: the edition and the original PDF at this story */}
            <SourceStrip
              variant="open"
              edition={{ ...story.edition, issue: edition.issue }}
              pdfUrl={edition.pdfUrl}
              pdfPage={story.pdfPages[0]}
            />
          </div>
        </section>

        {after.length > 0 && (
          <section className="ed-news__box" aria-labelledby="rail-next-title">
            <h2 className="ed-news__boxkicker" id="rail-next-title">
              Up next in this issue
            </h2>
            <ol className="ed-news__list">
              {after.map((s) => (
                <li key={s.slug} className="ed-news__item">
                  <span className="ed-news__num" aria-hidden="true">
                    {String(issue.indexOf(s) + 1).padStart(2, "0")}
                  </span>
                  <span className="ed-news__itembody">
                    <span className="ed-news__itemsection">{s.section}</span>
                    <Link href={s.href} className="ed-news__itemtitle">
                      {s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}
                    </Link>
                  </span>
                  {s.images[0] && (
                    <span className="ed-news__thumb" aria-hidden="true">
                      {/* small or very wide photographs are shown whole, never enlarged */}
                      <PlatePhoto src={s.images[0].src} alt={s.images[0].alt || s.printedTitle} sizes="84px" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <Link href={`/inflight-magazine/${edition.slug}#in-this-issue`} className="ed-more ed-news__all">
              All {issue.length} stories in this issue <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </section>
        )}

        {more.length > 0 && (
          <section className="ed-news__box ed-news__box--more" aria-labelledby="rail-more-title">
            <h2 className="ed-news__boxkicker" id="rail-more-title">
              More in {moreTitle ?? "this section"}
            </h2>
            <ul className="ed-news__reads">
              {more.map((s, i) => (
                <li key={s.slug} className="ed-news__read">
                  {/* a photograph leads the list; the rest read as headlines,
                      so the column fills the screen without becoming a long
                      scroll of its own */}
                  {i === 0 && s.images[0] && (
                    <span className="ed-news__readplate" aria-hidden="true">
                      {/* below 960px the column stacks under the article at full width */}
                      <PlatePhoto src={s.images[0].src} alt={s.images[0].alt || s.printedTitle} sizes="(max-width: 959px) 92vw, 288px" />
                    </span>
                  )}
                  <Link href={s.href} className="ed-news__readtitle">
                    {s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}
                  </Link>
                  <span className="ed-news__readmeta">
                    {s.edition.month} {s.edition.year}
                    {s.author ? ` · ${s.author}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
