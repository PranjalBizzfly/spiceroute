import Link from "next/link";
import InThisStory from "@/components/story/InThisStory";
import PlatePhoto from "@/components/PlatePhoto";
import type { StoryEntry, StorySection } from "@/types";

interface StorySideListProps {
  stories: StoryEntry[];
  /** The story's printed subheads, where it has enough of them. */
  sections?: StorySection[];
  /** The story's topics. */
  topics?: string[];
  title?: string;
}

/**
 * The article page's left column: the reader's own place in the story. Its
 * printed subheads as a live contents list, the story's topics, then a plain
 * list of other stories — printed section, headline, and a photograph on the
 * first and the middle item so the column reads down the page rather than
 * running out under the text. Pure navigation; it carries no story text of
 * its own, and every line of it comes from the verified stories.
 */
export default function StorySideList({ stories, sections, topics = [], title = "More stories" }: StorySideListProps) {
  if (!stories.length && !sections && !topics.length) return null;
  // the second photograph falls in the middle of a long list, never last
  const midPlate = stories.length >= 5 ? Math.floor(stories.length / 2) : -1;

  return (
    <aside className="ed-news__left" aria-label="About this story">
      <div className="ed-news__stack">
        {sections && sections.length > 0 && (
          <section className="ed-news__leftbox ed-news__leftbox--contents">
            <InThisStory sections={sections} />
          </section>
        )}

        {topics.length > 0 && (
          <section className="ed-news__leftbox ed-news__topics" aria-labelledby="left-topics-title">
            <h2 className="ed-news__boxkicker" id="left-topics-title">
              Topics
            </h2>
            <ul className="ed-news__topiclist">
              {topics.map((tag) => (
                <li key={tag} className="badge badge-outline">
                  {tag}
                </li>
              ))}
            </ul>
          </section>
        )}

        {stories.length > 0 && (
          <section className="ed-news__leftbox" aria-labelledby="left-more-title">
            <h2 className="ed-news__boxkicker" id="left-more-title">
              {title}
            </h2>
            <ul className="ed-briefs">
              {stories.map((s, i) => (
                <li key={s.slug} className="ed-brief">
                  <p className="ed-brief__section">{s.section}</p>
                  <h3 className="ed-brief__title">
                    <Link href={s.href}>{s.label ? `${s.printedTitle} · ${s.label}` : s.printedTitle}</Link>
                  </h3>
                  {(i === 0 || i === midPlate) && s.images[0] && (
                    <div className="ed-brief__plate">
                      <PlatePhoto src={s.images[0].src} alt={s.images[0].alt || s.printedTitle} sizes="240px" />
                    </div>
                  )}
                  <p className="ed-brief__meta">
                    {s.edition.month} {s.edition.year}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
