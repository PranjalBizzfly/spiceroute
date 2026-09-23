import Image from "next/image";
import { imageFocus } from "@/lib/imageFocus";
import { localImageSize } from "@/lib/imageSize";

/** A photograph is never shown larger than this multiple of its own pixels. */
export const MAX_SCALE = 1.5;

/** Files at least this wide fill any plate on the site without enlarging. */
const LARGE = 1400;

/** Photographs this far from square (spreads, strips) are shown whole. */
const WIDE = 2;
const TALL = 0.5;

interface PlatePhotoProps {
  src: string;
  alt: string;
  sizes: string;
  /** Class for the photograph layer (e.g. its hover or stacking rules). */
  className?: string;
  priority?: boolean;
}

/**
 * A story photograph filling a fixed plate (card, tile, portrait) — the plate
 * keeps its size, so grids stay aligned. The edition PDFs yield many small
 * photographs, so inside a plate larger than MAX_SCALE × the file the
 * photograph stays at that size, centred, over a soft blurred copy of itself
 * that fills the plate. In a plate that is small enough it simply fills it,
 * exactly as before. The limit is pure CSS, so it holds at every width.
 * Photographs far from square (printed spreads) are shown whole the same way,
 * rather than cropped to a sliver.
 */
export default function PlatePhoto({ src, alt, sizes, className, priority = false }: PlatePhotoProps) {
  const size = localImageSize(src);
  const focus = imageFocus(src);
  const loading = priority ? "eager" : "lazy";

  const ratio = size ? size.width / size.height : 1;
  // a two-page spread in a card would keep a third of itself: show it whole
  const whole = ratio > WIDE || ratio < TALL;

  if (!size || (size.width >= LARGE && !whole)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={loading}
        fetchPriority={priority ? "high" : undefined}
        className={className}
        style={{ objectFit: "cover", objectPosition: focus }}
      />
    );
  }

  return (
    <span
      className={["ed-photo", whole ? "ed-photo--whole" : null, className].filter(Boolean).join(" ")}
      style={
        {
          "--photo-w": `${Math.round(size.width * MAX_SCALE)}px`,
          "--photo-h": `${Math.round(size.height * MAX_SCALE)}px`,
        } as React.CSSProperties
      }
    >
      <Image src={src} alt="" aria-hidden="true" fill sizes="96px" loading={loading} className="ed-photo__backdrop" />
      <span className="ed-photo__frame">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={loading}
          fetchPriority={priority ? "high" : undefined}
          style={{ objectPosition: focus }}
        />
      </span>
    </span>
  );
}
