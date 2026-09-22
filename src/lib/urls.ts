import { categories } from "../data/categories";
import type { Story } from "../types";

/*
 * Public URLs for stories and story categories — the one place they are
 * built. Data keys (story.slug, story.category, image folders) never change;
 * this maps them to the public addresses:
 *
 *   /stories/<category-slug>               the category page
 *   /stories/<category-slug>/<story-slug>  a story
 *
 * Category slugs follow the category's page name (categories.ts). A story's
 * slug is its data key, except where that key did not describe the story
 * (RENAMED_STORIES). Every earlier address redirects permanently to the
 * current one (LEGACY_REDIRECTS, used by next.config.ts).
 */

/** Story keys whose public slug differs from the key: [category id, slug]. */
const RENAMED_STORIES: Record<string, [category: string, slug: string]> = {
  // phrases that were never printed in the story; now its printed headline
  "ladakh-roof-of-the-world": ["destinations", "many-shades-of-ladakh"],
  "varanasi-the-eternal-city": ["destinations", "varanasi-the-eternal-charm"],
  "sweet-devotion-modak-traditions": ["culture", "on-the-modak-trail"],
  // the printed section ("Take Off") rather than the story
  "global-flavours-take-off": ["cuisine", "global-flavours-on-indian-plate"],
  // the printed column is "My Town", as for every other town
  "my-hometown-gwalior": ["destinations", "my-town-gwalior"],
  "my-hometown-wayanad": ["destinations", "my-town-wayanad"],
  "my-hometown-jaipur": ["destinations", "my-town-jaipur"],
  // no other Info Corner address carries its date
  "buddha-purnima-info-corner-may-2026": ["culture", "buddha-purnima-info-corner"],
};

/** Category keys whose public slug changed to match the category's name. */
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  travel: "travel",
  cuisine: "cuisine",
  interviews: "interviews",
  wellness: "wellness",
  wildlife: "wildlife",
  culture: "culture",
};

const categoryById = new Map(categories.map((c) => [c.id, c]));
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

/** The public slug of a category key (e.g. "cuisine" → "food-flavours"). */
export const categorySlug = (id: string) => categoryById.get(id)?.slug ?? id;

/** The category key for a public category slug. */
export const categoryIdFromSlug = (slug: string) => categoryBySlug.get(slug)?.id;

export const categoryHref = (id: string) => `/stories/${categorySlug(id)}`;

export const storyUrlSlug = (s: Pick<Story, "slug">) => RENAMED_STORIES[s.slug]?.[1] ?? s.slug;

export const storyHref = (s: Pick<Story, "category" | "slug">) => `${categoryHref(s.category)}/${storyUrlSlug(s)}`;

/**
 * Every earlier story and category address and where it lives now, for
 * permanent redirects (next.config.ts). Renamed stories come first, from both
 * their old and new category addresses, so each needs a single hop.
 */
export function legacyRedirects() {
  const out: { source: string; destination: string }[] = [];
  for (const [key, [category]] of Object.entries(RENAMED_STORIES)) {
    const now = storyHref({ category, slug: key });
    for (const before of [`/stories/${LEGACY_CATEGORY_SLUGS[category] ?? category}/${key}`, `${categoryHref(category)}/${key}`])
      if (before !== now && !out.some((r) => r.source === before)) out.push({ source: before, destination: now });
  }
  for (const [id, oldSlug] of Object.entries(LEGACY_CATEGORY_SLUGS)) {
    const now = categorySlug(id);
    if (oldSlug === now) continue;
    out.push({ source: `/stories/${oldSlug}`, destination: `/stories/${now}` });
    out.push({ source: `/stories/${oldSlug}/:slug`, destination: `/stories/${now}/:slug` });
  }
  return out;
}

/** The current slug for an earlier category slug (e.g. "travel" → "travel-escapes"). */
export function legacyCategorySlug(old: string): string | undefined {
  const id = Object.keys(LEGACY_CATEGORY_SLUGS).find((k) => LEGACY_CATEGORY_SLUGS[k] === old);
  return id ? categorySlug(id) : undefined;
}
