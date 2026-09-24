import Image from "next/image";
import type { StoryExtra } from "@/types";
import { toBlocks, type ExtraPlate } from "@/lib/extras";
import { MAX_SCALE, ROW_TARGET, plateRows, type PlateRow } from "@/lib/plateRows";

/** No picture is set narrower than a sixth of its row: below that it is a sliver. */
const MIN_SHARE = 1 / 6;

/**
 * On a phone the column is a third as wide, so a row holds a third as much:
 * one or two pictures, three at most, none narrower than a quarter of the row.
 */
const NARROW_TARGET = 1.5;
const NARROW_MIN_SHARE = 1 / 4;
const NARROW_MAX_ITEMS = 3;

/** Widest the reading column is drawn, for the browser's choice of file. */
const COLUMN_PX = 680;

const pct = (v: number, of: number) => `${((100 * v) / of).toFixed(4)}%`;

/**
 * An advertisement the PDF stored as tiles, set back together: each tile at
 * its own place in the picture (a hair's overlap hides the seams), and a flat
 * tile that was never kept painted in its colour.
 */
function Composite({ plate, share, alt }: { plate: ExtraPlate; share: { vw: number; px: number }; alt: string }) {
  const c = plate.composite!;
  return (
    <span className="ed-pagefeat__composite">
      {c.fills.map((f, n) => (
        <span
          key={n}
          className="ed-pagefeat__fill"
          style={{ left: pct(f.x - 1, c.width), top: pct(f.y - 1, c.height), width: pct(f.w + 2, c.width), height: pct(f.h + 2, c.height), backgroundColor: f.color }}
        />
      ))}
      {c.tiles.map((t) => (
        <Image
          key={t.src}
          src={t.src}
          alt={alt}
          width={t.w}
          height={t.h}
          sizes={`(max-width: 959px) ${Math.ceil((share.vw * t.w) / c.width)}vw, ${Math.ceil((share.px * t.w) / c.width)}px`}
          loading="lazy"
          style={{ left: pct(t.x, c.width), top: pct(t.y, c.height), width: `calc(${pct(t.w, c.width)} + 1px)`, height: `calc(${pct(t.h, c.height)} + 1px)` }}
        />
      ))}
    </span>
  );
}

function Rows({ rows, className, alt }: { rows: PlateRow<ExtraPlate>[]; className: string; alt: string }) {
  return (
    <div className={className}>
      {rows.map((row) => (
        <div
          key={row.images[0].src}
          className="ed-pagefeat__row"
          style={{ ["--sum" as string]: row.sum.toFixed(4), ["--maxw" as string]: `${row.maxWidth}px` }}
        >
          {row.images.map((img) => {
            const r = img.width / img.height;
            // the picture's share of the column, for the browser's choice of file
            const share = { vw: (100 * r) / row.sum, px: (COLUMN_PX * r) / row.sum };
            return (
              <figure
                key={img.src}
                className={img.composite ? "ed-pagefeat__plate ed-pagefeat__plate--composite" : "ed-pagefeat__plate"}
                style={{ ["--r" as string]: r.toFixed(4) }}
              >
                {img.composite ? (
                  <Composite plate={img} share={share} alt={alt} />
                ) : (
                  <Image
                    src={img.src}
                    alt={alt}
                    width={img.width}
                    height={img.height}
                    sizes={`(max-width: 959px) ${Math.ceil(share.vw)}vw, ${Math.ceil(share.px)}px`}
                    loading="lazy"
                  />
                )}
              </figure>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const sameRows = (a: PlateRow<ExtraPlate>[], b: PlateRow<ExtraPlate>[]) =>
  a.length === b.length && a.every((row, i) => row.images.length === b[i].images.length && row.images[0] === b[i].images[0]);

/**
 * The rest of the edition printed around this article — its features,
 * advertising, SpiceJet's own pages and readers' pages — set as the magazine
 * sets them, and set the same way every time: each page opens on its own
 * heading, its printed text reads in one column in the article's own type, and
 * its pictures run underneath in even rows, each row filling the column at one
 * shared height. Nothing floats beside the text, so no page is left half
 * empty and no page of pictures reads as a scattering. A phone gets rows of
 * its own — one or two pictures each — rather than the wide rows squeezed.
 */
export default function StoryExtras({ extras }: { extras: StoryExtra[] }) {
  const blocks = toBlocks(extras);
  if (!blocks.length) return null;

  return (
    <div className="ed-pages">
      {blocks.map((block, i) => {
        const wide = block.images.length ? plateRows(block.images, ROW_TARGET, MAX_SCALE, MIN_SHARE) : [];
        const narrow = block.images.length ? plateRows(block.images, NARROW_TARGET, MAX_SCALE, NARROW_MIN_SHARE, NARROW_MAX_ITEMS) : [];
        return (
          <section key={i} className="ed-pagefeat">
            {block.title && <h2 className="ed-pagefeat__title">{block.title}</h2>}

            {block.pieces.length > 0 && (
              <div className="ed-pagefeat__text">
                {block.pieces.map((piece, n) => {
                  if (piece.kind === "heading")
                    return (
                      <h3 key={n} className="ed-pagefeat__sub">
                        {piece.text}
                      </h3>
                    );
                  if (piece.kind === "link")
                    return (
                      <p key={n} className="ed-pagefeat__contact">
                        <a href={piece.href} {...(piece.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                          {piece.text}
                        </a>
                      </p>
                    );
                  return <p key={n}>{piece.text}</p>;
                })}
              </div>
            )}

            {block.images.length > 0 &&
              (sameRows(wide, narrow) ? (
                <Rows rows={wide} className="ed-pagefeat__plates" alt={block.title ?? "Advertisement from the printed edition of Spice Route"} />
              ) : (
                <>
                  <Rows rows={wide} className="ed-pagefeat__plates ed-pagefeat__plates--wide" alt={block.title ?? "Advertisement from the printed edition of Spice Route"} />
                  <Rows rows={narrow} className="ed-pagefeat__plates ed-pagefeat__plates--narrow" alt={block.title ?? "Advertisement from the printed edition of Spice Route"} />
                </>
              ))}
          </section>
        );
      })}
    </div>
  );
}
