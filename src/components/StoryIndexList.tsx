import Image from "next/image";
import Link from "next/link";
import { Story } from "@/types";
import { imageFocus } from "@/lib/imageFocus";
import { storyKicker } from "./StoryCard";

interface StoryIndexListProps {
  stories: Story[];
  /** Show the author line instead of the edition line. */
  showAuthor?: boolean;
  /** Show each story's own image as a small thumbnail. */
  withThumbs?: boolean;
  startIndex?: number;
}

/**
 * Ruled editorial index — a magazine contents list rather than a card grid.
 */
export default function StoryIndexList({
  stories,
  showAuthor = true,
  withThumbs = false,
  startIndex = 1,
}: StoryIndexListProps) {
  return (
    <div className="ed-index-wrap">
      <ol className="ed-index">
        {stories.map((story, i) => {
          const thumb = withThumbs && story.heroImage;
          return (
            <li
              key={story.slug}
              className={`ed-index__item${thumb ? " ed-index__item--thumb" : ""}`}
            >
              <span className="ed-index__num" aria-hidden="true">
                {String(startIndex + i).padStart(2, "0")}
              </span>

              <div className="ed-index__body">
                {storyKicker(story) && <p className="ed-card__cat">{storyKicker(story)}</p>}
                <h3 className="ed-index__title">
                  <Link
                    href={`/stories/${story.category}/${story.slug}`}
                    className="ed-index__link"
                  >
                    {story.title}
                  </Link>
                </h3>
                {story.excerpt && <p className="ed-card__excerpt">{story.excerpt}</p>}
              </div>

              <div className="ed-index__aside">
                {showAuthor && story.author && (
                  <span className="ed-card__author">{story.author}</span>
                )}
                <span>{story.editionTitle}</span>
              </div>

              {thumb && story.heroImage && (
                <div className="ed-index__thumb">
                  <Image
                    src={story.heroImage}
                    alt={story.heroImageAlt ?? ""}
                    fill
                    sizes="(max-width: 639px) 72px, 104px"
                    loading="lazy"
                    style={{ objectPosition: imageFocus(story.heroImage) }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
