import Image from "next/image";
import Link from "next/link";
import { Story } from "@/types";
import { categories } from "@/data/categories";
import { imageFocus } from "@/lib/imageFocus";

export type StoryCardVariant =
  | "featured"
  | "standard"
  | "horizontal"
  | "compact"
  | "quote";

interface StoryCardProps {
  story: Story;
  variant?: StoryCardVariant;
  /** Show the verified image mapped to this story. Defaults per variant. */
  withImage?: boolean;
  /** Heading level so each section keeps a correct outline. */
  headingLevel?: "h2" | "h3" | "h4";
  /** Show the edition this story was published in. */
  showEdition?: boolean;
  sizes?: string;
  priority?: boolean;
  /** Featured only: keep the image above the text with a landscape plate. */
  stacked?: boolean;
  className?: string;
}

const DEFAULT_IMAGE_BY_VARIANT: Record<StoryCardVariant, boolean> = {
  featured: true,
  standard: true,
  horizontal: false,
  compact: false,
  quote: false,
};

const DEFAULT_SIZES_BY_VARIANT: Record<StoryCardVariant, string> = {
  featured: "(max-width: 759px) 92vw, (max-width: 1199px) 46vw, 430px",
  standard: "(max-width: 619px) 92vw, (max-width: 979px) 46vw, 380px",
  horizontal: "(max-width: 559px) 112px, 148px",
  compact: "148px",
  quote: "148px",
};

export function categoryLabel(categorySlug: string): string {
  return (
    categories.find((category) => category.slug === categorySlug)?.name ??
    categorySlug
  );
}

/**
 * Card kicker: the printed magazine section, plus the printed place label
 * where one is set beside the headline. Omitted when it would just repeat the
 * headline (e.g. "My Town", "Welcome Aboard").
 */
export function storyKicker(story: Story): string | null {
  const kicker = story.label ? `${story.section} · ${story.label}` : story.section;
  return kicker.toLowerCase() === story.title.toLowerCase() ? null : kicker;
}

export default function StoryCard({
  story,
  variant = "standard",
  withImage,
  headingLevel = "h3",
  showEdition = false,
  sizes,
  priority = false,
  stacked = false,
  className,
}: StoryCardProps) {
  const Heading = headingLevel;
  const href = `/stories/${story.category}/${story.slug}`;
  const showImage =
    (withImage ?? DEFAULT_IMAGE_BY_VARIANT[variant]) && Boolean(story.heroImage);
  const pullQuote = variant === "quote" ? story.pullQuotes?.[0] : undefined;

  return (
    <article
      className={[
        `ed-card`,
        `ed-card--${variant}`,
        stacked && variant === "featured" ? "ed-card--stack" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showImage && story.heroImage && (
        <div className="ed-card__plate">
          <Image
            src={story.heroImage}
            // the photograph is the story's own; without a description it is
            // decorative next to the printed title below it
            alt={story.heroImageAlt ?? ""}
            fill
            sizes={sizes ?? DEFAULT_SIZES_BY_VARIANT[variant]}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            style={{ objectPosition: imageFocus(story.heroImage) }}
          />
        </div>
      )}

      <div className="ed-card__body">
        {storyKicker(story) && <p className="ed-card__cat">{storyKicker(story)}</p>}

        <Heading className="ed-card__title">
          <Link href={href} className="ed-card__link">
            {story.title}
          </Link>
        </Heading>

        {pullQuote ? (
          <blockquote className="ed-quote">&ldquo;{pullQuote}&rdquo;</blockquote>
        ) : (
          story.excerpt && <p className="ed-card__excerpt">{story.excerpt}</p>
        )}

        {(story.author || showEdition) && (
          <p className="ed-card__meta">
            {story.author && (
              <span className="ed-card__author">
                {story.author}
                {story.role && <span className="ed-card__role">, {story.role}</span>}
              </span>
            )}
            {showEdition && <span>{story.editionTitle}</span>}
          </p>
        )}
      </div>
    </article>
  );
}
