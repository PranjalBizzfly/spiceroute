import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { categoryLabel, storyKicker } from "@/components/StoryCard";
import { imageFocus } from "@/lib/imageFocus";
import type { Story } from "@/types";
import { storyHref } from "@/lib/urls";

/** A printed pull quote in quotation marks, unless it was printed with them. */
const quoted = (text: string) => (/^[“"‘]/.test(text) ? text : `“${text}”`);

/**
 * One story across the whole screen: its lead photograph full bleed, with a
 * card carrying the headline and its printed pull quote (or its standfirst).
 * Only for photographs extracted large enough to stay sharp at that size.
 */
export default function Panorama({ story, kicker, id }: { story: Story; kicker?: string; id: string }) {
  if (!story.heroImage) return null;
  const href = storyHref(story);
  const quote = story.pullQuotes?.[0];
  return (
    <section className="ed-panorama" aria-labelledby={id}>
      <div className="ed-panorama__media">
        <Image
          src={story.heroImage}
          alt={story.heroImageAlt ?? ""}
          fill
          sizes="100vw"
          style={{ objectPosition: imageFocus(story.heroImage) }}
        />
      </div>
      <div className="container ed-panorama__inner">
        <Reveal className="ed-panorama__card">
          <p className="ed-kicker">{kicker ?? storyKicker(story) ?? categoryLabel(story.category)}</p>
          <h2 id={id} className="ed-panorama__title">
            <Link href={href}>{story.title}</Link>
          </h2>
          {quote ? (
            <blockquote className="ed-panorama__quote">{quoted(quote)}</blockquote>
          ) : (
            story.excerpt && <p className="ed-panorama__excerpt">{story.excerpt}</p>
          )}
          <p className="ed-panorama__meta">{[story.author, story.editionTitle].filter(Boolean).join(" · ")}</p>
        </Reveal>
      </div>
    </section>
  );
}
