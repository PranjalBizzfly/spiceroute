import Image from "next/image";
import { imageFocus } from "@/lib/imageFocus";
import { localImageSize } from "@/lib/imageSize";

/** A photograph is never shown larger than this multiple of its own pixels. */
export const MAX_SCALE = 1;

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
 * keeps its size, so grids stay aligned. The photograph fills the plate as far
 * as it can without being cut down or blurred: it is never drawn larger than
 * MAX_SCALE × its own pixels, and never cropped to less than four fifths of
 * itself in either direction — a portrait magazine page in a landscape card
 * would otherwise lose its top and bottom halves. Whatever of the plate it
 * leaves is filled by a soft blurred copy of itself. Both limits are pure CSS
 * (the frame is sized against the plate with container units), so they hold
 * at every width and in every plate shape. Photographs far from square
 * (printed spreads) are shown whole the same way.
 */
export default function PlatePhoto({ src, alt, sizes, className, priority = false }: PlatePhotoProps) {
  const size = localImageSize(src);
  const focus = imageFocus(src);
  const loading = priority ? "eager" : "lazy";

  const ratio = size ? size.width / size.height : 1;
  // a two-page spread in a card would keep a third of itself: show it whole
  const whole = ratio > WIDE || ratio < TALL;

  if (!size) {
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
          "--photo-r": ratio.toFixed(4),
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
