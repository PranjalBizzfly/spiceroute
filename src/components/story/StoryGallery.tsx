"use client";

import Image from "next/image";
import PdfButton from "@/components/PdfButton";
import type { GalleryGroup, StoryGalleryImage } from "@/types";
import { PrintedCaptions, useLightbox } from "./Lightbox";

interface StoryGalleryProps {
  group: GalleryGroup;
  /** Story-wide index of the group's first photograph, for the lightbox. */
  start: number;
  pdfUrl: string;
  editionTitle: string;
}

/** Summed width:height a row aims for — about three landscape photographs. */
const ROW_TARGET = 2.6;
/** Never shown larger than this multiple of a photograph's own pixels. */
const MAX_SCALE = 1.5; // as PlatePhoto: never beyond 1.5 × the file

/**
 * Splits photographs into rows in printed order, as evenly as possible (each
 * row's summed width:height as close to ROW_TARGET as the photographs allow).
 * Every photograph in a row shares one height and keeps its own proportions,
 * so nothing is cropped.
 */
function rows(images: StoryGalleryImage[]) {
  const r = images.map((img) => img.width / img.height);
  const n = r.length;
  // best[i] = lowest cost of laying out images i..n-1; cut[i] = end of its first row
  const best = new Array<number>(n + 1).fill(Infinity);
  const cut = new Array<number>(n + 1).fill(n);
  best[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i; j < n; j++) {
      sum += r[j];
      const cost = (sum - ROW_TARGET) ** 2 + best[j + 1];
      if (cost < best[i]) {
        best[i] = cost;
        cut[i] = j + 1;
      }
    }
  }
  const out: { images: StoryGalleryImage[]; sum: number; maxWidth: number }[] = [];
  for (let i = 0; i < n; i = cut[i]) {
    const imgs = images.slice(i, cut[i]);
    const sum = r.slice(i, cut[i]).reduce((a, b) => a + b, 0);
    // the shared height stays within MAX_SCALE of the smallest photograph's own height
    const maxWidth = Math.round(MAX_SCALE * Math.min(...imgs.map((x) => x.height)) * sum);
    out.push({ images: imgs, sum, maxWidth });
  }
  return out;
}

/**
 * The photographs printed on one page (or spread) of the story, at their own
 * proportions, with the captions printed on that page. Each photograph opens
 * the story's lightbox; the page label opens the original PDF at that page.
 */
export default function StoryGallery({ group, start, pdfUrl, editionTitle }: StoryGalleryProps) {
  const open = useLightbox();
  const pages = group.printedPages;
  const indexOf = new Map(group.images.map((img, k) => [img.src, start + k]));
  return (
    <figure className="ed-gallery">
      {rows(group.images).map((row) => (
        <div key={row.images[0].src} className="ed-gallery__row" style={{ ["--sum" as string]: row.sum.toFixed(4), ["--maxw" as string]: `${row.maxWidth}px` }}>
          {row.images.map((img) => {
            const r = img.width / img.height;
            return (
              <button
                key={img.src}
                type="button"
                className="ed-gallery__item"
                style={{ ["--r" as string]: r.toFixed(4) }}
                onClick={() => open(indexOf.get(img.src)!)}
                aria-haspopup="dialog"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  sizes={`(max-width: 760px) ${Math.ceil((92 * r) / row.sum)}vw, ${Math.ceil((700 * r) / row.sum)}px`}
                  loading="lazy"
                />
                <span className="visually-hidden"> — enlarge photograph</span>
              </button>
            );
          })}
        </div>
      ))}
      <figcaption className="ed-gallery__caption">
        <PdfButton pdfUrl={pdfUrl} title={editionTitle} page={group.pdfPages[0]} className="ed-gallery__page">
          Page{pages.length > 1 ? "s" : ""} {pages.join("–")} in print
        </PdfButton>
        <PrintedCaptions captions={group.captions} />
      </figcaption>
    </figure>
  );
}
