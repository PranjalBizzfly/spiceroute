import Image from "next/image";
import Link from "next/link";
import type { EditionEntry } from "@/types";
import PdfButton from "./PdfButton";

interface EditionCardProps {
  edition: Pick<EditionEntry, "slug" | "title" | "month" | "year" | "volume" | "issue" | "cover" | "pdfUrl" | "storyIds" | "pdfOnly">;
  sizes?: string;
  priority?: boolean;
  /** Heading level inside its section. */
  headingLevel?: "h2" | "h3";
}

/**
 * Cover-led edition card: the printed cover carries the card, with a short
 * caption beneath. The whole card opens the edition's page on the website
 * (web-first); the original PDF is a quiet secondary action.
 */
export default function EditionCard({
  edition,
  sizes = "(max-width: 479px) 70vw, (max-width: 819px) 46vw, 280px",
  priority = false,
  headingLevel = "h3",
}: EditionCardProps) {
  const Heading = headingLevel;
  const href = `/inflight-magazine/${edition.slug}`;
  const count = edition.storyIds.length;

  return (
    <article className="ed-edition">
      {/* No overlays: the printed masthead and cover lines stay visible */}
      <div className="ed-edition__cover">
        <Image
          src={edition.cover}
          alt={`Cover of ${edition.title}, ${edition.month} ${edition.year}`}
          fill
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
        />
      </div>

      <div className="ed-edition__body">
        <Heading className="ed-edition__title">
          {/* Primary: the edition's own page on this site (stretched over the card) */}
          <Link href={href} className="ed-edition__read">
            {edition.month} {edition.year}
          </Link>
        </Heading>

        {edition.issue && (
          <p className="ed-edition__date">
            {/* each half kept whole, so a narrow card breaks between them */}
            <span className="ed-nowrap">Vol. {edition.volume}</span> · <span className="ed-nowrap">Issue {edition.issue}</span>
          </p>
        )}

        <p className={`ed-edition__kind${edition.pdfOnly ? " is-pdf" : " is-web"}`}>
          {edition.pdfOnly ? "Full edition as PDF" : `${count} ${count === 1 ? "story" : "stories"} on the web`}
        </p>

        {/* Secondary: the original PDF */}
        <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} className="ed-edition__pdf">
          View Original PDF <span aria-hidden="true">↗</span>
        </PdfButton>
      </div>
    </article>
  );
}
