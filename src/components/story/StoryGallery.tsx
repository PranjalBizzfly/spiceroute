"use client";

import Image from "next/image";
import type { GalleryGroup } from "@/types";
import { MAX_SCALE, plateRows, type PlateRow } from "@/lib/plateRows";
import { PrintedCaptions, useLightbox } from "./Lightbox";

/**
 * On a phone a row of four printed photographs would draw an upright one as a
 * sliver, so the phone gets rows of its own: one or two photographs each,
 * three at most, none narrower than a quarter of the row.
 */
const NARROW_TARGET = 1.5;
const NARROW_MIN_SHARE = 1 / 4;
const NARROW_MAX_ITEMS = 3;

type GalleryImage = GalleryGroup["images"][number];

interface StoryGalleryProps {
  group: GalleryGroup;
  /** Story-wide index of the group's first photograph, for the lightbox. */
  start: number;
}

/**
 * The photographs printed on one page (or spread) of the story, at their own
 * proportions, with the captions printed alongside them. Each photograph
 * opens the story's lightbox.
 */
export default function StoryGallery({ group, start }: StoryGalleryProps) {
  const open = useLightbox();
  const indexOf = new Map(group.images.map((img, k) => [img.src, start + k]));
  const wide = plateRows(group.images);
  const narrow = plateRows(group.images, NARROW_TARGET, MAX_SCALE, NARROW_MIN_SHARE, NARROW_MAX_ITEMS);
  const same = wide.length === narrow.length && wide.every((row, i) => row.images.length === narrow[i].images.length && row.images[0] === narrow[i].images[0]);

  const rows = (list: PlateRow<GalleryImage>[], className?: string) => (
    <div className={className}>
      {list.map((row) => (
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
                  sizes={`(max-width: 959px) ${Math.ceil((100 * r) / row.sum)}vw, ${Math.ceil((700 * r) / row.sum)}px`}
                  loading="lazy"
                />
                <span className="visually-hidden"> — enlarge photograph</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <figure className="ed-gallery">
      {same ? rows(wide) : (
        <>
          {rows(wide, "ed-gallery__rows--wide")}
          {rows(narrow, "ed-gallery__rows--narrow")}
        </>
      )}
      <figcaption className="ed-gallery__caption">
        <PrintedCaptions captions={group.captions} />
      </figcaption>
    </figure>
  );
}
