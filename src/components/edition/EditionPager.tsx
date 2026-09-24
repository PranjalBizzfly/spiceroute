import Image from "next/image";
import Link from "next/link";
import type { EditionRef } from "@/types";

interface EditionPagerProps {
  previous?: EditionRef;
  next?: EditionRef;
}

/** Previous (older) / next (newer) edition, by printed month and year. */
export default function EditionPager({ previous, next }: EditionPagerProps) {
  return (
    <nav className="ed-pager" aria-label="Edition navigation">
      {previous ? (
        <Link href={`/inflight-magazine/${previous.slug}`} className="ed-pager__link ed-pager__link--prev" rel="prev">
          <span className="ed-pager__thumb">
            <Image src={previous.cover} alt={`Spice Route ${previous.month} ${previous.year} cover`} fill sizes="64px" loading="lazy" />
          </span>
          <span className="ed-pager__text">
            <span className="ed-pager__dir">
              <span aria-hidden="true">&larr; </span>Previous edition
            </span>
            <span className="ed-pager__title">
              {previous.month} {previous.year}
            </span>
          </span>
        </Link>
      ) : (
        <p className="ed-pager__end">Oldest edition in the archive</p>
      )}

      {next ? (
        <Link href={`/inflight-magazine/${next.slug}`} className="ed-pager__link ed-pager__link--next" rel="next">
          <span className="ed-pager__text">
            <span className="ed-pager__dir">
              Next edition<span aria-hidden="true"> &rarr;</span>
            </span>
            <span className="ed-pager__title">
              {next.month} {next.year}
            </span>
          </span>
          <span className="ed-pager__thumb">
            <Image src={next.cover} alt={`Spice Route ${next.month} ${next.year} cover`} fill sizes="64px" loading="lazy" />
          </span>
        </Link>
      ) : (
        <p className="ed-pager__end ed-pager__end--next">This is the latest edition</p>
      )}
    </nav>
  );
}
