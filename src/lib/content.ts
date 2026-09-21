import { editions as editionData } from "@/data/editions";
import { stories as storyData } from "@/data/stories";
import { readingTime } from "@/lib/readingTime";
import type { Edition, EditionEntry, EditionRef, GalleryGroup, Story, StoryEntry, StoryRef, StorySection } from "@/types";

/*
 * Single place where editions and stories are joined. Everything relational —
 * an edition's stories, PDF-only status, previous/next edition, previous/next
 * story — is derived here from the verified data, never stored twice.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const chronoKey = (e: Pick<Edition, "month" | "year">) => e.year * 12 + MONTHS.indexOf(e.month);

export const storyHref = (s: Pick<Story, "category" | "slug">) => `/stories/${s.category}/${s.slug}`;
export const editionHref = (slug: string) => `/inflight-magazine/${slug}`;

/** Printed reading order inside an edition: the page the story starts on. */
const byPrintedOrder = (a: Story, b: Story) => a.source.printedPages[0] - b.source.printedPages[0];

// Newest first, by the printed month and year (not by array position).
const sortedEditions = [...editionData].sort((a, b) => chronoKey(b) - chronoKey(a));

const toRef = (e: Edition): EditionRef => ({ slug: e.slug, title: e.title, month: e.month, year: e.year, cover: e.cover });

const storiesByEdition = new Map<string, Story[]>();
for (const s of storyData) {
  const list = storiesByEdition.get(s.editionSlug) ?? [];
  list.push(s);
  storiesByEdition.set(s.editionSlug, list);
}
for (const list of storiesByEdition.values()) list.sort(byPrintedOrder);

const editionEntries: EditionEntry[] = sortedEditions.map((e, i) => {
  const own = storiesByEdition.get(e.slug) ?? [];
  const older = sortedEditions[i + 1];
  const newer = sortedEditions[i - 1];
  return {
    ...e,
    storyIds: own.map((s) => s.id),
    pdfOnly: own.length === 0,
    ...(older ? { previousEdition: toRef(older) } : {}),
    ...(newer ? { nextEdition: toRef(newer) } : {}),
  };
});

const editionBySlug = new Map(editionEntries.map((e) => [e.slug, e]));

const toStoryRef = (s: Story): StoryRef => ({
  slug: s.slug,
  href: storyHref(s),
  printedTitle: s.title,
  ...(s.label ? { label: s.label } : {}),
  section: s.section,
  ...(s.heroImage ? { image: s.heroImage, imageAlt: s.heroImageAlt ?? "" } : {}),
});

/** Anchor id of the n-th printed subhead (1-based); ArticleBody uses the same. */
export const sectionId = (n: number) => `section-${n}`;

/** Printed subheads (not the minor, secondary ones), in order. */
function storySections(s: Story): StorySection[] {
  const out: StorySection[] = [];
  for (const b of s.body) {
    if (b.type !== "subhead" || b.level === 3) continue;
    out.push({ id: sectionId(out.length + 1), text: b.text.replace(/\*+/g, ""), ...(b.number !== undefined ? { number: b.number } : {}) });
  }
  return out;
}

/**
 * Gallery photographs grouped by the page(s) they are printed on, with the
 * captions printed on those pages. A spread photograph spans two pages.
 */
function galleryGroups(s: Story): GalleryGroup[] {
  // printed page(s) on a PDF page: one, or the story's pages of a spread
  const printed = (p: number): number[] => {
    if (!s.source.spreads) return [s.source.printedPages[s.source.pdfPages.indexOf(p)] ?? p];
    const pair = [2 * p - 2, 2 * p - 1];
    const own = pair.filter((n) => s.source.printedPages.includes(n));
    return own.length ? own : pair;
  };
  const groups = new Map<string, { pdf: number[]; images: GalleryGroup["images"]; captions: GalleryGroup["captions"] }>();
  const groupFor = (pdf: number[]) => {
    const key = pdf.join("-");
    if (!groups.has(key)) groups.set(key, { pdf, images: [], captions: [] });
    return groups.get(key)!;
  };
  for (const img of s.gallery ?? []) groupFor(img.pdfPages).images.push(img);
  for (const c of s.printedCaptions ?? []) {
    // a caption joins the group printed on its page (or the spread covering it)
    const g = [...groups.values()].find((x) => x.pdf.includes(c.pdfPage)) ?? groupFor([c.pdfPage]);
    g.captions.push(c);
  }
  return [...groups.values()]
    .sort((a, b) => a.pdf[0] - b.pdf[0])
    .map((g) => ({ pdfPages: g.pdf, printedPages: g.pdf.flatMap(printed), images: g.images, captions: g.captions }));
}

/** The printed standfirst; for pieces printed without one, the opening text, shortened at a word. */
function summary(s: Story): string {
  if (s.excerpt) return s.excerpt;
  const first = s.body.find((b) => b.type === "p");
  const text = first && "text" in first ? first.text.replace(/\*+/g, "") : "";
  if (text.length <= 160) return text;
  return text.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}

const storyEntries: StoryEntry[] = storyData.map((s) => {
  const edition = editionBySlug.get(s.editionSlug);
  if (!edition) throw new Error(`Story ${s.slug} references unknown edition ${s.editionSlug}`);
  const siblings = storiesByEdition.get(s.editionSlug) ?? [];
  const at = siblings.findIndex((x) => x.slug === s.slug);
  const prev = siblings[at - 1];
  const next = siblings[at + 1];
  return {
    ...s,
    href: storyHref(s),
    printedTitle: s.title,
    standfirst: s.excerpt,
    summary: summary(s),
    edition: toRef(edition),
    images: s.heroImage
      ? [
          {
            src: s.heroImage,
            alt: s.heroImageAlt ?? "",
            source: s.heroImageSource ?? "",
            ...(s.heroImageCaption ? { caption: s.heroImageCaption } : {}),
            licence: s.heroImageLicence,
          },
        ]
      : [],
    captions: s.heroImageCaption ? [s.heroImageCaption] : [],
    galleryGroups: galleryGroups(s),
    sections: storySections(s),
    pdfPages: s.source.pdfPages,
    printedPages: s.source.printedPages,
    readingTime: readingTime(s),
    ...(prev ? { previousStory: toStoryRef(prev) } : {}),
    ...(next ? { nextStory: toStoryRef(next) } : {}),
  };
});

const storyBySlug = new Map(storyEntries.map((s) => [s.slug, s]));

/** All editions, newest first. */
export const getEditions = (): EditionEntry[] => editionEntries;

export const getEdition = (slug: string): EditionEntry | undefined => editionBySlug.get(slug);

export const getLatestEdition = (): EditionEntry => editionEntries[0];

/** An edition's web stories in printed reading order. */
export const getEditionStories = (slug: string): StoryEntry[] =>
  (editionBySlug.get(slug)?.storyIds ?? []).map((id) => storyBySlug.get(id)!);

export const getStories = (): StoryEntry[] => storyEntries;

export const getStory = (slug: string): StoryEntry | undefined => storyBySlug.get(slug);

/** Editions nearest in time to the given one (excluding it), newest first. */
export function getNearbyEditions(slug: string, count = 4): EditionEntry[] {
  const i = editionEntries.findIndex((e) => e.slug === slug);
  if (i < 0) return [];
  return editionEntries
    .map((e, j) => ({ e, d: Math.abs(j - i) }))
    .filter(({ d }) => d > 0)
    .sort((a, b) => a.d - b.d || editionEntries.indexOf(a.e) - editionEntries.indexOf(b.e))
    .slice(0, count)
    .map(({ e }) => e)
    .sort((a, b) => chronoKey(b) - chronoKey(a));
}

/**
 * Related stories, in order of verified closeness:
 * same edition (printed order), then same web category, then same printed
 * section in other editions. No other relationships are implied.
 */
export function getRelatedStories(slug: string, count = 3): StoryEntry[] {
  const s = storyBySlug.get(slug);
  if (!s) return [];
  const seen = new Set([slug, s.previousStory?.slug, s.nextStory?.slug]);
  const pick: StoryEntry[] = [];
  const add = (list: StoryEntry[]) => {
    for (const x of list) {
      if (pick.length >= count) return;
      if (!seen.has(x.slug)) {
        seen.add(x.slug);
        pick.push(x);
      }
    }
  };
  add(getEditionStories(s.editionSlug));
  add(storyEntries.filter((x) => x.category === s.category));
  add(storyEntries.filter((x) => x.section === s.section));
  return pick;
}

/** Year groups for the archive, newest first. */
export function getEditionYears(): number[] {
  return [...new Set(editionEntries.map((e) => e.year))].sort((a, b) => b - a);
}

/** "September 2026" */
export const editionDate = (e: Pick<Edition, "month" | "year">) => `${e.month} ${e.year}`;
