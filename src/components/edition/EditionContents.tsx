import PlatePhoto from "@/components/PlatePhoto";
import Link from "next/link";
import type { StoryEntry } from "@/types";

interface EditionContentsProps {
  stories: StoryEntry[];
}

/**
 * The issue's contents page: its web stories in printed reading order, each
 * with its printed section, so every story reads back to its place in the
 * magazine.
 */
export default function EditionContents({ stories }: EditionContentsProps) {
  return (
    <ol className="ed-toc">
      {stories.map((s, i) => (
        <li key={s.slug} className="ed-toc__item">
          <span className="ed-toc__num" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="ed-toc__body">
            <p className="ed-toc__section">{s.section}</p>
            <h3 className="ed-toc__title">
              <Link href={s.href} className="ed-toc__link">
                {s.printedTitle}
                {s.label && <span className="ed-toc__label"> · {s.label}</span>}
              </Link>
            </h3>
            {s.standfirst && <p className="ed-toc__standfirst">{s.standfirst}</p>}
            <p className="ed-toc__meta">
              {s.author && (
                <span className="ed-card__author">
                  {s.author}
                  {s.role && <span className="ed-card__role">, {s.role}</span>}
                </span>
              )}
              <span>{s.readingTime}</span>
            </p>
            <span className="ed-toc__read" aria-hidden="true">
              Read story <span className="ed-more__arrow">&rarr;</span>
            </span>
          </div>
          {s.images[0] && (
            <div className="ed-toc__thumb">
              <PlatePhoto src={s.images[0].src} alt={s.images[0].alt} sizes="(max-width: 639px) 84px, (max-width: 1199px) 160px, 280px" />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
