import Link from "next/link";
import type { StoryEntry } from "@/types";

/**
 * A compact contents list of one issue — number, printed section, headline and
 * printed page — for the homepage. The edition page carries the full version.
 */
export default function IssueIndex({ stories }: { stories: StoryEntry[] }) {
  return (
    // Two columns read down, like a contents page: 01–05, then 06–10
    <ol className="ed-issueindex" style={{ "--rows": Math.ceil(stories.length / 2) } as React.CSSProperties}>
      {stories.map((s, i) => (
        <li key={s.slug} className="ed-issueindex__item">
          <span className="ed-issueindex__num" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="ed-issueindex__body">
            <span className="ed-issueindex__section">{s.section}</span>
            <Link href={s.href} className="ed-issueindex__title">
              {s.printedTitle}
              {s.label && <span className="ed-issueindex__label"> · {s.label}</span>}
            </Link>
          </span>
          <span className="ed-issueindex__page">
            <span className="visually-hidden">Printed page </span>
            <span aria-hidden="true">p. </span>
            {s.printedPages[0]}
          </span>
        </li>
      ))}
    </ol>
  );
}
