"use client";

import Image from "next/image";
import type { GalleryGroup } from "@/types";
import { plateRows } from "@/lib/plateRows";
import { PrintedCaptions, useLightbox } from "./Lightbox";

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
  return (
    <figure className="ed-gallery">
      {plateRows(group.images).map((row) => (
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
        <PrintedCaptions captions={group.captions} />
      </figcaption>
    </figure>
  );
}
