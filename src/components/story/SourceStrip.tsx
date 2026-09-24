import Image from "next/image";
import Link from "next/link";
import PdfButton from "@/components/PdfButton";

interface SourceStripProps {
  /** "open" sits under the byline; "close" ends the article, with the cover. */
  variant: "open" | "close";
  edition: { slug: string; title: string; month: string; year: number; issue?: number; cover: string };
  pdfUrl: string;
  /** PDF page the story starts on — the reader opens there. */
  pdfPage?: number;
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 16.5h7" />
    </svg>
  );
}

/**
 * Where the story is printed: its edition and the original
 * PDF, opened at the story's first page. Set at the top and at the end of
 * every article, so the print source is always one step away.
 */
export default function SourceStrip({ variant, edition, pdfUrl, pdfPage }: SourceStripProps) {
  const editionHref = `/inflight-magazine/${edition.slug}`;
  const editionName = `${edition.month} ${edition.year}${edition.issue ? ` · Issue ${edition.issue}` : ""}`;

  return (
    <section className={`ed-source ed-source--${variant}`} aria-label={variant === "open" ? "Source edition" : "This story's edition"}>
      {variant === "close" && (
        <Link href={editionHref} className="ed-source__cover" tabIndex={-1} aria-hidden="true">
          <Image src={edition.cover} alt={`Spice Route ${edition.month} ${edition.year} cover`} fill sizes="96px" loading="lazy" />
        </Link>
      )}
      <dl className="ed-source__facts">
        <div>
          <dt>From</dt>
          <dd>
            <Link href={editionHref}>{editionName}</Link>
          </dd>
        </div>
      </dl>
      <div className="ed-source__actions">
        <PdfButton pdfUrl={pdfUrl} title={edition.title} page={pdfPage} className={variant === "open" ? "ed-source__pdf" : "btn btn-primary btn-sm"}>
          <PdfIcon />
          Read original PDF
        </PdfButton>
        {variant === "close" && (
          <Link href={editionHref} className="btn btn-outline btn-sm">
            Back to the {edition.month} {edition.year} edition
          </Link>
        )}
      </div>
    </section>
  );
}
