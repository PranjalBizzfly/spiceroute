import type { Metadata } from "next";
import Link from "next/link";
import { getEditions, getLatestEdition } from "@/lib/content";

export const metadata: Metadata = {
  title: "Page not found | Spice Route",
};

/** 404 for unknown URLs and for edition / story slugs that do not exist. */
export default function NotFound() {
  const latest = getLatestEdition();
  const total = getEditions().length;

  return (
    <section className="ed-issue__hero ed-notfound" aria-labelledby="notfound-title">
      <div className="container">
        <div className="ed-page__head">
          <p className="ed-kicker ed-kicker--red">Error 404</p>
          <h1 id="notfound-title" className="ed-issue__title">
            Page not found
          </h1>
          <p className="ed-shead__sub">The page you asked for is not on this site. It may have moved, or the address may be mistyped.</p>
        </div>
        <div className="ed-actions">
          <Link href={`/inflight-magazine/${latest.slug}`} className="btn btn-primary">
            Read the {latest.month} {latest.year} issue <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href="/inflight-magazine" className="btn btn-outline">
            Browse all {total} editions
          </Link>
          <Link href="/" className="ed-more ed-hero__publish">
            Home <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
