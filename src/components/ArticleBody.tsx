import type { ArticleBlock, GalleryGroup } from "@/types";
import { sectionId } from "@/lib/content";
import RichText from "./RichText";
import StoryGallery from "./story/StoryGallery";

interface ArticleBodyProps {
  body: ArticleBlock[];
  /** Printed pull quotes, spaced through the text (never inside a paragraph). */
  pullQuotes?: string[];
  /** The story's printed photographs, page by page. */
  galleries?: GalleryGroup[];
  /** Each printed subhead opens and closes its own text (reference pieces). */
  collapsible?: boolean;
}

/** Renders the printed article, block by block, in printed order. */
export default function ArticleBody({ body, pullQuotes = [], galleries = [], collapsible = false }: ArticleBodyProps) {
  // Place each pull quote after an evenly spaced paragraph.
  const paragraphIdx = body.map((b, i) => (b.type === "p" ? i : -1)).filter((i) => i >= 0);
  const quoteAfter = new Map<number, string>();
  pullQuotes.forEach((q, n) => {
    const at = paragraphIdx[Math.floor(((n + 1) * paragraphIdx.length) / (pullQuotes.length + 1))];
    if (at !== undefined && !quoteAfter.has(at)) quoteAfter.set(at, q);
  });
  const placed = new Set(quoteAfter.values());
  const leftover = pullQuotes.filter((q) => !placed.has(q));

  // Printed subheads get anchors, numbered as in "In this story"
  let section = 0;
  const anchors = body.map((b) => (b.type === "subhead" && b.level !== 3 ? sectionId(++section) : undefined));

  // Each page's photographs follow the text printed on that page (photographs
  // from pages before the text starts follow the first page of text)
  const galleryAfter = new Map<number, React.ReactNode[]>();
  const trailing: React.ReactNode[] = [];
  const firstPage = Math.min(...body.map((b) => b.page ?? Infinity));
  let start = 0;
  for (const g of galleries) {
    const page = Math.max(g.pdfPages[g.pdfPages.length - 1], firstPage);
    const at = body.findLastIndex((b) => b.page !== undefined && b.page <= page);
    const el = <StoryGallery key={g.pdfPages.join("-")} group={g} start={start} />;
    start += g.images.length;
    if (at < 0) trailing.push(el);
    else galleryAfter.set(at, [...(galleryAfter.get(at) ?? []), el]);
  }

  const blocks = body.map((block, i) => (
    <Block key={i} block={block} after={quoteAfter.get(i)} anchor={anchors[i]} photos={galleryAfter.get(i)} />
  ));

  return (
    <div className={`ed-article${body.length ? "" : " ed-article--plates"}`}>
      {collapsible ? <Folds body={body} blocks={blocks} anchors={anchors} /> : blocks}
      {leftover.map((q) => (
        <PullQuote key={q} text={q} />
      ))}
      {trailing}
    </div>
  );
}

/**
 * Reference pieces: each printed subhead becomes a disclosure holding the
 * blocks up to the next subhead. Text before the first subhead stays open.
 */
function Folds({ body, blocks, anchors }: { body: ArticleBlock[]; blocks: React.ReactNode[]; anchors: (string | undefined)[] }) {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < body.length && !anchors[i]) out.push(blocks[i++]);
  while (i < body.length) {
    const head = body[i] as Extract<ArticleBlock, { type: "subhead" }>;
    const id = anchors[i]!;
    const inner: React.ReactNode[] = [];
    let j = i + 1;
    while (j < body.length && !anchors[j]) inner.push(blocks[j++]);
    out.push(
      <details key={id} id={id} className="ed-fold">
        <summary className="ed-fold__summary">
          <h2 className="ed-article__subhead ed-fold__title">
            {head.number !== undefined && (
              <span className="ed-article__num" aria-hidden="true">
                {head.number}
              </span>
            )}
            <RichText text={head.text} />
          </h2>
        </summary>
        <div className="ed-fold__body">{inner}</div>
      </details>
    );
    i = j;
  }
  return out;
}

function Block({ block, after, anchor, photos }: { block: ArticleBlock; after?: string; anchor?: string; photos?: React.ReactNode[] }) {
  let el: React.ReactNode;
  switch (block.type) {
    case "subhead":
      el =
        block.level === 3 ? (
          <h3 className="ed-article__subhead ed-article__subhead--minor">
            <RichText text={block.text} />
          </h3>
        ) : (
          <h2 className="ed-article__subhead" id={anchor}>
            {block.number !== undefined && (
              <span className="ed-article__num" aria-hidden="true">
                {block.number}
              </span>
            )}
            <RichText text={block.text} />
          </h2>
        );
      break;
    case "question":
      el = (
        <p className="ed-article__q">
          <RichText text={block.text} />
        </p>
      );
      break;
    case "note":
      el = (
        <p className="ed-article__note">
          <RichText text={block.text} />
        </p>
      );
      break;
    case "list":
      el = (
        <ul className="ed-article__list">
          {block.items.map((item) => (
            <li key={item}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
      break;
    default:
      el = (
        <p>
          <RichText text={block.text} />
        </p>
      );
  }
  return (
    <>
      {el}
      {after && <PullQuote text={after} />}
      {photos}
    </>
  );
}

function PullQuote({ text }: { text: string }) {
  return (
    <blockquote className="ed-pullquote">
      <p>{text}</p>
    </blockquote>
  );
}
