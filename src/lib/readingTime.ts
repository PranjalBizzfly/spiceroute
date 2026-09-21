import { Story } from "@/types";

/**
 * Reading time, calculated only from the printed article text shown on the
 * page: the standfirst plus every body block (paragraphs, subheads, questions,
 * notes, list items). Call-out boxes and pull quotes are excluded because they
 * repeat or sit outside the article text.
 *
 * Rate: 200 words per minute, rounded to the nearest minute, minimum 1.
 */
export const WORDS_PER_MINUTE = 200;

export function articleWordCount(story: Story): number {
  const parts: string[] = [story.excerpt];
  for (const block of story.body) {
    if (block.type === "list") parts.push(...block.items);
    else parts.push(block.text);
  }
  return parts
    .join(" ")
    .replace(/\*/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function readingTime(story: Story): string {
  const minutes = Math.max(1, Math.round(articleWordCount(story) / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}
