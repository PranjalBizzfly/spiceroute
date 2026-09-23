/**
 * Printed caption labels.
 *
 * A caption block printed in the magazine is often introduced by where its
 * pictures sat on the printed page — "Left & Below", "Clockwise from Top",
 * "Top, Insert & Bottom". On the web the pictures are laid out differently,
 * so those labels point at an arrangement the reader cannot see, and they
 * tell the reader about the printed page rather than about the subject.
 *
 * Labels that name a subject instead — "Wayanad", "World Water Day",
 * "September 2026" — are caption content and are always kept.
 */

/** Words that only ever describe a position on the printed page. */
const PLACE_WORDS = new Set([
  "anti", "clockwise", "anticlockwise", "top", "bottom", "above", "below",
  "left", "right", "centre", "center", "middle", "insert", "inset", "facing",
  "opposite", "overleaf", "spread", "page", "main",
  // the words that join them up
  "from", "to", "and",
]);

/**
 * True when every word of the label describes a place on the printed page,
 * and the label therefore says nothing about the photographs themselves.
 */
export function isPlaceLabel(label: string): boolean {
  const words = label.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.length > 0 && words.every((w) => PLACE_WORDS.has(w));
}

/** The label to show for a printed caption block, if any. */
export function captionLabel(label?: string): string | undefined {
  return label && !isPlaceLabel(label) ? label : undefined;
}
