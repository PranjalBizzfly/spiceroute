import Image from "next/image";
import Link from "next/link";
import type { StoryEntry } from "@/types";

interface EditionContentsProps {
  stories: StoryEntry[];
}

/**
 * The issue's contents page: web stories in printed reading order, grouped by
 * the section they are printed under, with their printed page numbers.
 */
export default function EditionContents({ stories }: EditionContentsProps) {
  // Consecutive stories printed under the same section form one group.
  const groups: { section: string; items: StoryEntry[] }[] = [];
  for (const s of stories) {
    const last = groups[groups.length - 1];
    if (last && last.section === s.section) last.items.push(s);
    else groups.push({ section: s.section, items: [s] });
  }

  return (
    <ol className="ed-toc">
      {groups.map((g) => (
        <li key={`${g.section}-${g.items[0].slug}`} className="ed-toc__group">
          <h3 className="ed-toc__section">{g.section}</h3>
          <ul className="ed-toc__list">
            {g.items.map((s) => (
              <li key={s.slug} className="ed-toc__item">
                <span className="ed-toc__page">
                  <span className="visually-hidden">Page </span>
                  {s.printedPages[0]}
                </span>
                <div className="ed-toc__body">
                  <h4 className="ed-toc__title">
                    <Link href={s.href} className="ed-toc__link">
                      {s.label && <span className="ed-toc__label">{s.label}: </span>}
                      {s.printedTitle}
                    </Link>
                  </h4>
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
                </div>
                {s.images[0] && (
                  <div className="ed-toc__thumb">
                    <Image src={s.images[0].src} alt={s.images[0].alt} fill sizes="(max-width: 639px) 76px, 120px" loading="lazy" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
