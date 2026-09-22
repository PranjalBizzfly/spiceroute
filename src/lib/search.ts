import { categories } from "@/data/categories";
import { editionDate, editionHref, getEditions, getStories } from "@/lib/content";
import type { Category, EditionEntry, StoryEntry } from "@/types";

/*
 * Site search over the published (verified) data only: story headlines,
 * printed labels and sections, bylines, standfirsts and full article text;
 * editions by month, year, issue and volume; and the story categories.
 * Every snippet shown is an exact slice of the printed text.
 */

const norm = (s: string) =>
  s
    .replace(/\*+/g, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

const plain = (s: string) => s.replace(/\*+/g, "");

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a term at the start of a word; short terms (≤3 letters) must be whole words. */
const matcher = (t: string) => new RegExp(`(?:^|[^a-z0-9])${escapeRe(t)}${t.length <= 3 ? "(?![a-z0-9])" : ""}`);

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

interface IndexedStory {
  story: StoryEntry;
  category?: Category;
  /** weighted fields, normalised */
  head: string;
  meta: string;
  standfirst: string;
  /** printed body blocks, markup stripped (for snippets) and normalised (for matching) */
  blocks: { text: string; n: string }[];
}

let index: IndexedStory[] | undefined;
function storyIndex(): IndexedStory[] {
  // built lazily from the live data so new stories are always included
  index ??= getStories().map((story) => {
    const category = categoryBySlug.get(story.category);
    const blocks = story.body
      .flatMap((b) => ("items" in b ? b.items : [b.text]))
      .map((t) => ({ text: plain(t), n: norm(t) }));
    return {
      story,
      category,
      head: norm([story.printedTitle, story.label ?? ""].join(" ")),
      meta: norm([story.section, category?.name ?? "", story.author ?? "", editionDate(story.edition), story.edition.title].join(" ")),
      standfirst: norm(story.summary),
      blocks,
    };
  });
  return index;
}

export interface StoryHit {
  story: StoryEntry;
  category?: Category;
  /** Source-exact standfirst, or the printed passage the query was found in. */
  excerpt: string;
  matchedInText: boolean;
}

export interface SearchResults {
  query: string;
  category?: Category;
  stories: StoryHit[];
  editions: EditionEntry[];
  categories: (Category & { count: number })[];
}

/** An exact passage of printed text around the first match, cut at word boundaries. */
function snippet(text: string, n: string, term: RegExp, span = 220): string {
  const at = term.exec(n)?.index ?? -1;
  if (text.length <= span || at < 0) return text.length <= span ? text : text.slice(0, span).replace(/\s+\S*$/, "") + "…";
  let start = Math.max(0, at - Math.floor(span / 3));
  if (start > 0) start = text.indexOf(" ", start) + 1;
  let end = Math.min(text.length, start + span);
  if (end < text.length) end = text.lastIndexOf(" ", end);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export function search(rawQuery: string, categorySlug?: string): SearchResults {
  const query = rawQuery.trim().slice(0, 100);
  const category = categorySlug ? categoryBySlug.get(categorySlug) : undefined;
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const pool = storyIndex().filter((s) => !category || s.story.category === category.slug);

  // No query: the story index itself (optionally one category), printed order
  if (!terms.length) {
    return {
      query,
      category,
      stories: pool.map((s) => ({ story: s.story, category: s.category, excerpt: s.story.summary, matchedInText: false })),
      editions: [],
      categories: [],
    };
  }

  const res = terms.map(matcher);
  const phraseRe = matcher(terms.join(" "));
  const scored: (StoryHit & { score: number })[] = [];
  for (const s of pool) {
    const all = [s.head, s.meta, s.standfirst, ...s.blocks.map((b) => b.n)].join(" ");
    if (!res.every((re) => re.test(all))) continue;
    let score = 0;
    for (const re of res) {
      if (re.test(s.head)) score += 10;
      if (re.test(s.meta)) score += 5;
      if (re.test(s.standfirst)) score += 3;
      score += Math.min(5, s.blocks.filter((b) => re.test(b.n)).length);
    }
    if (phraseRe.test(s.head)) score += 20;
    // show the standfirst unless the match is only in the article text
    const inHeadOrStandfirst = res.some((re) => re.test(s.head) || re.test(s.standfirst) || re.test(s.meta));
    const block = inHeadOrStandfirst ? undefined : s.blocks.find((b) => phraseRe.test(b.n)) ?? s.blocks.find((b) => res[0].test(b.n));
    scored.push({
      story: s.story,
      category: s.category,
      excerpt: block ? snippet(block.text, block.n, phraseRe.test(block.n) ? phraseRe : res[0]) : s.story.summary,
      matchedInText: Boolean(block),
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);

  const editions = category
    ? []
    : getEditions().filter((e) => {
        const text = norm(
          [e.title, e.month, String(e.year), editionDate(e), e.issue ? `issue ${e.issue}` : "", e.volume ? `volume ${e.volume} vol ${e.volume}` : ""].join(" "),
        );
        return res.every((re) => re.test(text));
      });

  const counts = new Map<string, number>();
  for (const s of storyIndex()) counts.set(s.story.category, (counts.get(s.story.category) ?? 0) + 1);
  const cats = category
    ? []
    : categories
        .filter((c) => counts.get(c.slug))
        .filter((c) => res.every((re) => re.test(norm(`${c.name} ${c.slug}`))))
        .map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }));

  return { query, category, stories: scored.map((h) => ({ story: h.story, category: h.category, excerpt: h.excerpt, matchedInText: h.matchedInText })), editions, categories: cats };
}

/** Categories that have at least one published story, with counts. */
export function storyCategories(): (Category & { count: number })[] {
  const counts = new Map<string, number>();
  for (const s of getStories()) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return categories.filter((c) => counts.get(c.slug)).map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }));
}

export { editionHref };
