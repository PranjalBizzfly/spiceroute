import Image from "next/image";
import type { StoryExtra } from "@/types";
import { toBlocks } from "@/lib/extras";
import { MAX_SCALE, ROW_TARGET, plateRows } from "@/lib/plateRows";

/** No picture is set narrower than a sixth of its row: below that it is a sliver. */
const MIN_SHARE = 1 / 6;

/**
 * The rest of the edition printed around this article — its features,
 * advertising, SpiceJet's own pages and readers' pages — set as the magazine
 * sets them, and set the same way every time: each page opens on its own
 * heading, its printed text reads in one column in the article's own type, and
 * its pictures run underneath in even rows, each row filling the column at one
 * shared height. Nothing floats beside the text, so no page is left half
 * empty and no page of pictures reads as a scattering.
 */
export default function StoryExtras({ extras }: { extras: StoryExtra[] }) {
  const blocks = toBlocks(extras);
  if (!blocks.length) return null;

  return (
    <div className="ed-pages">
      {blocks.map((block, i) => (
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

          {block.images.length > 0 && (
            <div className="ed-pagefeat__plates">
              {plateRows(block.images, ROW_TARGET, MAX_SCALE, MIN_SHARE).map((row) => (
                <div
                  key={row.images[0].src}
                  className="ed-pagefeat__row"
                  style={{ ["--sum" as string]: row.sum.toFixed(4), ["--maxw" as string]: `${row.maxWidth}px` }}
                >
                  {row.images.map((img) => {
                    const r = img.width / img.height;
                    return (
                      <figure key={img.src} className="ed-pagefeat__plate" style={{ ["--r" as string]: r.toFixed(4) }}>
                        <Image
                          src={img.src}
                          alt=""
                          width={img.width}
                          height={img.height}
                          sizes={`(max-width: 760px) ${Math.ceil((92 * r) / row.sum)}vw, ${Math.ceil((640 * r) / row.sum)}px`}
                          loading="lazy"
                        />
                      </figure>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
