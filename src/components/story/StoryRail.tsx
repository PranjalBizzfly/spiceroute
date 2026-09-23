import Image from "next/image";
import Link from "next/link";
import InThisStory from "@/components/story/InThisStory";
import SourceStrip from "@/components/story/SourceStrip";
import PlatePhoto from "@/components/PlatePhoto";
import type { EditionEntry, StoryEntry } from "@/types";

interface StoryRailProps {
  story: StoryEntry;
  edition: EditionEntry;
  /** The whole issue, in printed order. */
  issue: StoryEntry[];
}

/** How many of the issue's following stories the rail lists. */
const UP_NEXT = 5;

/**
 * The article's side column: the print edition with its original PDF, what
 * follows in the same issue, then the story's printed subheads (a live
 * contents list that stays in view on wide screens) — all navigation, no story text of its own.
 */
export default function StoryRail({ story, edition, issue }: StoryRailProps) {
  const at = issue.findIndex((s) => s.slug === story.slug);
  // the stories printed after this one, then wrapping to the front of the issue
  const after = [...issue.slice(at + 1), ...issue.slice(0, Math.max(0, at))].slice(0, UP_NEXT);

  return (
    <aside className="ed-news__rail" aria-label="About this story">
      <section className="ed-news__box ed-news__print" aria-labelledby="rail-print-title">
        <Link href={`/inflight-magazine/${edition.slug}`} className="ed-news__printcover" tabIndex={-1} aria-hidden="true">
          <Image src={edition.cover} alt="" fill sizes="96px" loading="lazy" />
        </Link>
        <div className="ed-news__printbody">
          <p className="ed-news__boxkicker" id="rail-print-title">
            In print
          </p>
          {edition.volume !== undefined && (
            <p className="ed-news__vol">
              Volume {edition.volume}
              {edition.pageCount ? ` · ${edition.pageCount} pages in print` : ""}
            </p>
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
                    <PlatePhoto src={s.images[0].src} alt="" sizes="72px" />
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
      {story.sections.length >= 3 && (
        <div className="ed-news__box ed-news__box--contents">
          <InThisStory sections={story.sections} />
        </div>
      )}

    </aside>
  );
}
