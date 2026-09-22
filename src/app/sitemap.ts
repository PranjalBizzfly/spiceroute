import type { MetadataRoute } from "next";
import { getEditions, getStories } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { storyCategories } from "@/lib/search";
import { categoryHref } from "@/lib/urls";

/*
 * Every indexable page: the four fixed pages, every edition, every story
 * category page and every web story. No lastModified — the site has no verified update dates.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/inflight-magazine",
    "/about",
    "/contact",
    ...getEditions().map((e) => `/inflight-magazine/${e.slug}`),
    ...storyCategories().map((c) => categoryHref(c.id)),
    ...getStories().map((s) => s.href),
  ];
  return paths.map((path) => ({ url: path === "/" ? SITE_URL : `${SITE_URL}${path}` }));
}
