/**
 * Pictures set in rows, the way the magazine sets them: every picture in a row
 * shares one height and keeps its own proportions, and each row fills the
 * column. Nothing is cropped, nothing is blown up past its own pixels, and no
 * picture is left stranded at a size that has nothing to do with its
 * neighbours — which is what makes a page of pictures read as a page rather
 * than as a scattering.
 */

export interface Plate {
  width: number;
  height: number;
  /** Largest multiple of its own pixels this picture may be drawn at, when not maxScale. */
  scale?: number;
}

export interface PlateRow<T> {
  images: T[];
  /** Summed width:height of the row — how wide it is at one unit of height. */
  sum: number;
  /** Widest the row may be drawn, so no picture is enlarged past MAX_SCALE. */
  maxWidth: number;
}

/** Summed width:height a row aims for — about three landscape photographs. */
export const ROW_TARGET = 2.6;
/** Never shown larger than this multiple of a picture's own pixels. */
export const MAX_SCALE = 1;
/** Never more than four pictures in a single row, so pictures don't compress into slivers. */
export const MAX_ROW_ITEMS = 4;

/**
 * Splits pictures into rows in printed order, as evenly as possible: each
 * row's summed width:height as close to `target` as the pictures allow, found
 * by working back from the last picture so the whole sequence is balanced
 * rather than only the first row.
 */
export function plateRows<T extends Plate>(
  images: T[],
  target = ROW_TARGET,
  maxScale = MAX_SCALE,
  /**
   * The least of a row's width any one picture may take. An upright picture
   * set beside two landscape ones takes a sixth of the row and is drawn as a
   * sliver; a row that would do that to a picture is not used at all.
   */
  minShare = 0,
  maxItems = MAX_ROW_ITEMS
): PlateRow<T>[] {
  const r = images.map((img) => img.width / img.height);
  const n = r.length;
  // best[i] = lowest cost of laying out images i..n-1; cut[i] = end of its first row
  const best = new Array<number>(n + 1).fill(Infinity);
  const cut = new Array<number>(n + 1).fill(n);
  best[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    let narrowest = Infinity;
    for (let j = i; j < n && j - i < maxItems; j++) {
      sum += r[j];
      narrowest = Math.min(narrowest, r[j]);
      if (j > i && narrowest / sum < minShare) break;
      const cost = (sum - target) ** 2 + best[j + 1];
      if (cost < best[i]) {
        best[i] = cost;
        cut[i] = j + 1;
      }
    }
  }
  const out: PlateRow<T>[] = [];
  for (let i = 0; i < n; i = cut[i]) {
    const imgs = images.slice(i, cut[i]);
    const sum = r.slice(i, cut[i]).reduce((a, b) => a + b, 0);
    // the shared height stays within maxScale of the smallest picture's own height
    const maxWidth = Math.round(Math.min(...imgs.map((x) => (x.scale ?? maxScale) * x.height)) * sum);
    out.push({ images: imgs, sum, maxWidth });
  }
  return out;
}
