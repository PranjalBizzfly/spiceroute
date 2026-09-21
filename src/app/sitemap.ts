import type { MetadataRoute } from "next";
import { getEditions, getStories } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/*
 * Every indexable page: the four fixed pages, all 29 editions and all 20
 * web stories. No lastModified — the site has no verified update dates.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/inflight-magazine",
    "/about",
    "/contact",
    ...getEditions().map((e) => `/inflight-magazine/${e.slug}`),
    ...getStories().map((s) => s.href),
  ];
  return paths.map((path) => ({ url: path === "/" ? SITE_URL : `${SITE_URL}${path}` }));
}
