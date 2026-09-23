import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import EditionCard from "@/components/EditionCard";
import PdfButton from "@/components/PdfButton";
import Reveal from "@/components/Reveal";
import EditionContents from "@/components/edition/EditionContents";
import EditionPager from "@/components/edition/EditionPager";
import Panorama from "@/components/Panorama";
import { localImageSize } from "@/lib/imageSize";
import { editionDate, getEdition, getEditions, getEditionStories, getNearbyEditions } from "@/lib/content";

interface PageProps {
  params: Promise<{ edition: string }>;
}

export async function generateStaticParams() {
  return getEditions().map((e) => ({ edition: e.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { edition: slug } = await params;
  const edition = getEdition(slug);
  if (!edition) return { title: "Edition Not Found" };

  const date = editionDate(edition);
  const stories = getEditionStories(slug);
  // Built only from verified facts: date, verified volume/issue, story headlines.
  const issueLine = edition.issue ? ` Volume ${edition.volume}, Issue ${edition.issue}.` : "";
  const description = edition.pdfOnly
    ? `The ${date} edition of Spice Route, the inflight magazine of SpiceJet.${issueLine} Read the complete edition as the original PDF.`
    : `The ${date} edition of Spice Route, the inflight magazine of SpiceJet.${issueLine} Read ${stories.length} stories online, including ${stories
        .filter((s) => s.section !== "Welcome Aboard")
        .slice(0, 3)
        .map((s) => (s.label ? `${s.printedTitle} (${s.label})` : s.printedTitle))
        .join(", ")}.`;
  const url = `/inflight-magazine/${slug}`;
  const image = { url: edition.cover, alt: `Cover of ${edition.title}` };

  return {
    title: `${date} Edition | Spice Route Inflight Magazine`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: `Spice Route — ${date}`, description, images: [image], siteName: "Spice Route Magazine" },
    twitter: { card: "summary_large_image", title: `Spice Route — ${date}`, description, images: [image.url] },
  };
}

export default async function EditionPage({ params }: PageProps) {
  const { edition: slug } = await params;
  const edition = getEdition(slug);
  if (!edition) notFound();

  const date = editionDate(edition);
  // In printed reading order — the issue's contents page
  const stories = getEditionStories(slug);
  const nearby = getNearbyEditions(slug, 4);
  const total = getEditions().length;
  // The issue's lead place, full bleed: the first story in printed order whose
  // lead photograph is landscape and large enough to stay sharp across the screen
  const panorama = stories.find((s) => {
    if (s.category === "predictions") return false;
    const size = s.heroImage ? localImageSize(s.heroImage) : undefined;
    // …and not a strip (e.g. a printed zodiac band), which a full-bleed band would crop to a sliver
    return size && size.width >= 1400 && size.height >= 500 && size.width > size.height && size.width / size.height <= 2.2;
  });
  const chapter = (n: number) => <span className="ed-shead__chapter">{String(n).padStart(2, "0")}</span>;

  return (
    <div className="ed-issue">
      {/* ============================ HERO ============================ */}
      <section className="ed-issue__hero ed-pagehero ed-scope-dark" aria-labelledby="edition-title">
        {/* Ambient colour from the printed cover (a tiny, blurred copy) */}
        <div className="ed-issue__ambient" aria-hidden="true">
          <Image src={edition.cover} alt="" fill sizes="64px" loading="eager" />
        </div>
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/inflight-magazine">Inflight Magazine</Link></li>
              <li aria-current="page">{date}</li>
            </ol>
          </nav>

          <div className="ed-issue__grid">
            <div className="ed-issue__cover ed-cover-in">
              <div className="ed-cover-frame">
                <div className="ed-cover">
                  <Image
                    src={edition.cover}
                    alt={`Cover of ${edition.title}, ${date}`}
                    fill
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 767px) 78vw, 440px"
                  />
                </div>
              </div>
            </div>

            <div className="ed-issue__intro">
              <p className="ed-kicker ed-rise">{edition.title}</p>
              <h1 id="edition-title" className="ed-issue__title ed-rise" style={{ "--rise-delay": 40 } as React.CSSProperties}>
                <span className="ed-issue__masthead">Spice Route</span>
                {date}
              </h1>

              <dl className="ed-issue__facts ed-rise" style={{ "--rise-delay": 80 } as React.CSSProperties}>
                {edition.volume && (
                  <div className="ed-fact">
                    <dt className="ed-fact__label">Volume</dt>
                    <dd className="ed-fact__value">{edition.volume}</dd>
                  </div>
                )}
                {edition.issue && (
                  <div className="ed-fact">
                    <dt className="ed-fact__label">Issue</dt>
                    <dd className="ed-fact__value ed-fact__value--gold">{edition.issue}</dd>
                  </div>
                )}
                {edition.pageCount && (
                  <div className="ed-fact">
                    <dt className="ed-fact__label">Pages in print</dt>
                    <dd className="ed-fact__value">{edition.pageCount}</dd>
                  </div>
                )}
                <div className="ed-fact">
                  <dt className="ed-fact__label">Web stories</dt>
                  <dd className="ed-fact__value">{stories.length}</dd>
                </div>
              </dl>

              {/* What can be read as HTML, and what needs the PDF */}
              <ul className="ed-access ed-rise" style={{ "--rise-delay": 120 } as React.CSSProperties}>
                <li className={`ed-access__item${stories.length ? " is-on" : " is-off"}`}>
                  <span className="ed-access__dot" aria-hidden="true" />
                  {stories.length
                    ? `Web stories available — ${stories.length} ${stories.length === 1 ? "story" : "stories"} from this issue`
                    : "No web stories from this issue"}
                </li>
                <li className="ed-access__item is-on">
                  <span className="ed-access__dot" aria-hidden="true" />
                  Full edition available as PDF{edition.pageCount ? ` — ${edition.pageCount} pages` : ""}
                </li>
              </ul>

              {edition.description && <p className="ed-issue__desc">{edition.description}</p>}

              <div className="ed-actions ed-rise" style={{ "--rise-delay": 160 } as React.CSSProperties}>
                {edition.pdfOnly ? (
                  <>
                    <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} className="btn btn-primary">
                      Read this edition online <span aria-hidden="true">&rarr;</span>
                    </PdfButton>
                    <a href={edition.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                      Open PDF in new tab <span aria-hidden="true">↗</span>
                    </a>
                  </>
                ) : (
                  <>
                    <a href="#in-this-issue" className="btn btn-primary">
                      Read the stories <span aria-hidden="true">&darr;</span>
                    </a>
                    <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} className="ed-more ed-issue__pdf">
                      View Original PDF <span aria-hidden="true">↗</span>
                    </PdfButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {edition.pdfOnly ? (
        /* ===================== PDF-FIRST EDITION ===================== */
        <section className="ed-section ed-section--tint" aria-labelledby="read-pdf-title">
          <div className="container">
            <Reveal>
              <div className="ed-pdfpanel">
                {edition.pageCount && (
                  <p className="ed-pdfpanel__pages">
                    <span>{edition.pageCount}</span> pages in print
                  </p>
                )}
                <div>
                  <p className="ed-kicker">Read this edition online</p>
                  <h2 id="read-pdf-title" className="ed-pdfpanel__title">The complete {date} edition, as printed</h2>
                  <p className="ed-pdfpanel__text">
                    Stories from this edition are not available as web articles. The full issue
                    {edition.pageCount ? ` — all ${edition.pageCount} pages —` : ""} can be read in the original PDF,
                    in the reader on this page or in a new tab.
                  </p>
                  <div className="ed-actions">
                    <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} className="btn btn-primary">
                      Open the PDF reader
                    </PdfButton>
                    <a href={edition.pdfUrl} download className="btn btn-outline">
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : (
        <>
          {/* ============ PANORAMA — the issue's lead place, full bleed ============ */}
          {panorama && <Panorama story={panorama} id="issue-panorama-title" kicker={`From this issue · ${panorama.section}`} />}

          {/* ============ CONTENTS — the issue's own contents page ============ */}
          <section id="in-this-issue" className="ed-section" aria-labelledby="contents-title">
            <div className="container">
              <Reveal>
                <div className="ed-shead">
                  <div className="ed-shead__main">
                    <p className="ed-kicker ed-kicker--red">{chapter(1)}{edition.issue ? `Issue ${edition.issue} · ${date}` : date}</p>
                    <h2 id="contents-title" className="ed-shead__title">In this issue</h2>
                    <p className="ed-shead__sub">
                      Every story from this edition that can be read on the web, in printed order.
                    </p>
                  </div>
                </div>
              </Reveal>
              <EditionContents stories={stories} />
            </div>
          </section>

          {/* ===================== THE PRINT EDITION ===================== */}
          <section className="ed-section ed-section--tight ed-section--rule" aria-labelledby="print-title">
            <div className="container">
              <div className="ed-pdfband">
                <div>
                  <p className="ed-kicker">{chapter(2)}The print edition</p>
                  <h2 id="print-title" className="ed-pdfband__title">The complete print edition</h2>
                  <p className="ed-pdfband__text">
                    The original PDF has every page of the {date} issue
                    {edition.pageCount ? ` (${edition.pageCount} pages)` : ""}, as printed for SpiceJet flights.
                  </p>
                </div>
                <div className="ed-actions">
                  <PdfButton pdfUrl={edition.pdfUrl} title={edition.title} className="btn btn-primary">
                    View original issue PDF <span aria-hidden="true">↗</span>
                  </PdfButton>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===================== EDITION NAVIGATION ===================== */}
      <section className="ed-section ed-section--tight ed-section--rule" aria-label="More editions">
        <div className="container">
          <EditionPager previous={edition.previousEdition} next={edition.nextEdition} />

          {nearby.length > 0 && (
            <div className="ed-issue__nearby">
              <div className="ed-shead">
                <div className="ed-shead__main">
                  <p className="ed-kicker">{!edition.pdfOnly && chapter(3)}Inflight archive</p>
                  <h2 className="ed-shead__title">Around this edition</h2>
                </div>
                <Link href="/inflight-magazine" className="ed-more">
                  All {total} editions <span className="ed-more__arrow" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <div className="ed-editions">
                {nearby.map((e, i) => (
                  <Reveal key={e.slug} delay={i * 60}>
                    <EditionCard edition={e} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
