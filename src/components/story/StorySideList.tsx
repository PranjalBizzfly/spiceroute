import Link from "next/link";
import PlatePhoto from "@/components/PlatePhoto";
import type { StoryEntry } from "@/types";

/**
 * The article page's left column: a plain list of other stories, newest issue
 * first — printed section, headline, and a photograph on the first item. Pure
 * navigation; it carries no story text of its own.
 */
export default function StorySideList({ stories, title = "More stories" }: { stories: StoryEntry[]; title?: string }) {
  if (!stories.length) return null;
  return (
    <aside className="ed-news__left" aria-label={title}>
      <h2 className="ed-news__boxkicker">{title}</h2>
      <ul className="ed-briefs">
        {stories.map((s, i) => (
          <li key={s.slug} className="ed-brief">
            <p className="ed-brief__section">{s.section}</p>
            <h3 className="ed-brief__title">
              <Link href={s.href}>{s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}</Link>
            </h3>
            {i === 0 && s.images[0] && (
              <div className="ed-brief__plate">
                <PlatePhoto src={s.images[0].src} alt="" sizes="220px" />
              </div>
            )}
            <p className="ed-brief__meta">
              {s.edition.month} {s.edition.year}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
