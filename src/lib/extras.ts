import type { StoryExtra } from "@/types";
import { extraImageKey, isJunkExtraImage } from "@/data/extrasImages";
import { composites, isCrispExtraImage, isHiddenExtraImage, type ExtraComposite } from "@/data/extrasLayout";

type StoryExtraImage = StoryExtra["images"][number];

/**
 * One picture as the page sets it: a printed picture, or an advertisement the
 * PDF stored as tiles, put back together (`composite`, sized in its own pixels).
 */
export interface ExtraPlate {
  src: string;
  width: number;
  height: number;
  /** Never drawn larger than its own pixels (QR codes, logos, lettering). */
  scale?: number;
  composite?: ExtraComposite;
}

/*
 * The pages printed around an article arrive from the PDF as lines in printed
 * order: headings set in capitals, body text broken at the printed line
 * endings, and contact details on their own lines. This turns those lines into
 * the pieces a page is built from — a heading, paragraphs, and contact links —
 * without changing a word: fragments are only joined with a space, in printed
 * order, so the printed text reads as it was written.
 *
 * What it does remove is what the PDF's text layer puts in that a reader never
 * saw: the same line repeated a dozen times where a caption was stamped over
 * each photograph, a word doubled over itself, and display lettering spaced out
 * a character at a time. On the page those are invisible; set as running text
 * they are gibberish.
 */

export type ExtraPiece =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

export interface ExtraBlock {
  /** The page's own heading, taken from its printed text. */
  title?: string;
  pieces: ExtraPiece[];
  images: ExtraPlate[];
}

const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()+-]{7,}$/;

/** Printed punctuation after an address belongs to the sentence, not the link:
    "write to us at marketing.ho@spicejet.com!" is not an address ending in "!" */
const withoutTail = (t: string) => t.replace(/[.,;:!?'")\]]+$/, "");

const isUrl = (t: string) => URL_RE.test(withoutTail(t));
const isEmail = (t: string) => EMAIL_RE.test(withoutTail(t));
// A telephone number, not the run of page numbers printed down a contents
// page: dialled numbers carry a country code or ten digits of their own.
const isPhone = (t: string) => PHONE_RE.test(t) && (t.startsWith("+") || t.replace(/\D/g, "").length >= 10);
const isContact = (t: string) => isUrl(t) || isEmail(t) || isPhone(t);

/** Set in capitals and short: a printed heading rather than a sentence. */
const isHeading = (t: string) => {
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (!letters || t.length > 60) return false;
  const caps = t.replace(/[^A-Z]/g, "").length;
  return caps / letters.length > 0.85;
};

/** A printed line that ends a sentence, so the next line starts a new one. */
const ends = (t: string) => /[.!?:;]["')\]]?$/.test(t);

export const linkHref = (t: string) => {
  const target = withoutTail(t);
  if (isEmail(target)) return `mailto:${target}`;
  if (isPhone(target)) return `tel:${target.replace(/[^\d+]/g, "")}`;
  return target.startsWith("http") ? target : `https://${target}`;
};

/**
 * Display type set letter by letter reaches the text layer as "C H A R T E R".
 * Those are words a reader saw in print, so the letters are set back into the
 * word — but only where every piece is a single letter and there are enough of
 * them to be a word. A line that mixes letters with fragments ("I N F L I G H T
 * M AG A Z I N E") is left exactly as printed rather than guessed at.
 */
const unspace = (t: string) => {
  const parts = t.trim().split(/\s+/);
  if (parts.length < 3 || !parts.every((p) => p.length === 1 && /[A-Za-z]/.test(p))) return t;
  return parts.join("");
};

/** A line of single letters spaced out by the printed setting, e.g. "T H E". */
const isSpacedOut = (t: string) => {
  const parts = t.trim().split(/\s+/);
  if (parts.length < 3) return false;
  const singles = parts.filter((p) => p.replace(/[^A-Za-z0-9]/g, "").length <= 1).length;
  return singles / parts.length > 0.4;
};

/**
 * The same line twice over, as the PDF sometimes stamps it: "KhushiKhushi",
 * or with the two set a space apart — "A GREAT PRODUCT IS NO LONGER A GREAT
 * PRODUCT IS NO LONGER", where display lettering was drawn twice to thicken it.
 */
const undouble = (t: string) => {
  const s = t.trim();
  // stamped with no gap, so not something anyone typed: "KhushiKhushi"
  const tight = /^(.{4,}?)\1+$/.exec(s);
  if (tight) return tight[1].trim();
  // a whole line run again. Long enough that ordinary repetition is safe:
  // "that that" and "New York, New York" are how they were written.
  const spaced = /^(.{12,}?)(?:\s+\1)+$/.exec(s);
  return spaced ? spaced[1].trim() : s;
};

/** How a line compares for sameness: wording, not spacing or punctuation. */
const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** One letter over and over, as a placeholder sets it: "XXXxxx". */
const isOneLetter = (t: string) => {
  const letters = t.toLowerCase().replace(/[^a-z]/g, "");
  return letters.length > 1 && new Set(letters).size === 1;
};

/**
 * The lines a reader actually saw. A caption stamped across a contact sheet
 * reaches the text layer once per photograph; set in a column it reads as the
 * same phrase twenty times over. Each wording is kept once, where it first
 * appears, and lettering spaced out a character at a time is dropped — it
 * carries no words that are not printed elsewhere on the page.
 */
export function cleanLines(paragraphs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of paragraphs) {
    const t = unspace(undouble(raw.trim()));
    if (!t || isOneLetter(t)) continue;
    const k = key(t);
    // a line of one or two characters is a stray mark from the page, not a word
    if (k.replace(/\s/g, "").length < 2) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Printed lines → pieces. Consecutive body lines are joined with a space
 * (the printed line endings are where the column ran out, not where the
 * sentence did); a line that ends a sentence closes the paragraph.
 */
/**
 * Printed lines into a paragraph. A word broken across a line ending is
 * sometimes recorded on both lines — "…capable of delivering" then
 * "delivering on everything it promises" — so a word repeated across the join
 * is set once. Only long words, and only at the join: "had had" within a line
 * is how it was written.
 */
const joinLines = (lines: string[]) =>
  lines.reduce((text, line) => {
    if (!text) return line;
    const before = /(\b[A-Za-z]{5,})[^A-Za-z]*$/.exec(text);
    const after = new RegExp(`^${before?.[1] ?? "\\0"}\\b`, "i");
    return before && after.test(line) ? text + line.slice(before[1].length).replace(/^\s*/, " ") : text + " " + line;
  }, "");

export function piecesFrom(paragraphs: string[]): ExtraPiece[] {
  const pieces: ExtraPiece[] = [];
  let open: string[] = [];
  const flush = () => {
    if (open.length) pieces.push({ kind: "text", text: joinLines(open) });
    open = [];
  };

  for (const t of cleanLines(paragraphs)) {
    if (isContact(t)) {
      flush();
      pieces.push({ kind: "link", text: t, href: linkHref(t) });
      continue;
    }
    if (isHeading(t)) {
      flush();
      pieces.push({ kind: "heading", text: t });
      continue;
    }
    open.push(t);
    if (ends(t)) flush();
  }
  flush();

  // A printed headline breaks across several lines, a few words to a line;
  // those fragments are one heading again. A fragment is only joined to a
  // heading that does not already read as a heading of its own, so two
  // separate headings printed one under the other stay two headings.
  const words = (t: string) => t.split(/\s+/).length;
  const merged: ExtraPiece[] = [];
  for (const piece of pieces) {
    const last = merged[merged.length - 1];
    // Display lettering breaks a word between two settings — "YOU1" then "st",
    // "Q" then "ueue." — and the tail reaches the text layer as a line of its
    // own. Joined back on to the heading it finishes the word; with no heading
    // to finish, it is a stray letter or two and carries nothing.
    if (piece.kind === "text" && !/\s/.test(piece.text) && piece.text.length <= 6 && /^[a-z]/.test(piece.text)) {
      if (last?.kind === "heading") last.text += piece.text;
      continue;
    }
    // …and where the rest of the page's text follows on the same line, the tail
    // is the paragraph's first word: "YOU1" then "st Here's an offering…".
    if (piece.kind === "text" && last?.kind === "heading" && /[0-9A-Z]$/.test(last.text)) {
      const tail = /^([a-z]{1,3})\s+(?=[A-Z0-9“"'])/.exec(piece.text);
      if (tail) {
        last.text += tail[1];
        piece.text = piece.text.slice(tail[0].length);
      }
    }
    const fragment = piece.kind === "heading" && words(piece.text) <= 3;
    const joinable =
      last?.kind === "heading" &&
      words(last.text) <= 3 &&
      !looksLikeTitle(last.text) &&
      !ends(last.text) &&
      last.text.length + piece.text.length <= 60;
    if (fragment && joinable) last.text = last.text + " " + piece.text;
    else merged.push({ ...piece });
  }
  return merged;
}

/** The page's own heading: a line that can carry the page, not a stray label. */
const looksLikeTitle = (t: string) =>
  t.length >= 12 && t.length <= 90 && t.split(/\s+/).length >= 2 && !/[:,]$/.test(t) && !isSpacedOut(t);

const headingFor = (pieces: ExtraPiece[]) => {
  const heading = pieces.findIndex((p) => p.kind === "heading" && looksLikeTitle(p.text));
  if (heading >= 0) return heading;
  return pieces.findIndex((p) => p.kind === "text" && looksLikeTitle(p.text));
};

/**
 * The page's pictures as the page sets them. An advertisement stored as tiles
 * is set once, whole, where its first tile falls, when every one of its tiles
 * is on the page; page furniture is left out; and `shown` keeps a picture
 * already set further up from being set again.
 */
function platesFor(images: StoryExtraImage[], shown: Set<string>): ExtraPlate[] {
  const onPage = new Set(images.map((img) => img.src));
  const tileOf = new Map<string, ExtraComposite>();
  for (const c of composites) if (c.parts.every((src) => onPage.has(src))) for (const src of c.parts) tileOf.set(src, c);

  const plates: ExtraPlate[] = [];
  const set = new Set<ExtraComposite>();
  for (const img of images) {
    const c = tileOf.get(img.src);
    if (c) {
      if (set.has(c)) continue;
      set.add(c);
      const key = "composite:" + c.tiles.map((t) => extraImageKey({ src: t.src, width: t.w, height: t.h })).join("+");
      if (shown.has(key)) continue;
      shown.add(key);
      for (const t of c.tiles) shown.add(extraImageKey({ src: t.src, width: t.w, height: t.h }));
      plates.push({ src: c.tiles[0].src, width: c.width, height: c.height, composite: c });
      continue;
    }
    if (isJunkExtraImage(img) || isHiddenExtraImage(img.src)) continue;
    const key = extraImageKey(img);
    if (shown.has(key)) continue;
    shown.add(key);
    plates.push(isCrispExtraImage(img.src) ? { ...img, scale: 1 } : { ...img });
  }
  return plates;
}

/**
 * One printed page as a block the page can set: its own heading, its text and
 * its pictures. The heading is lifted from the page's own text and is not
 * repeated in the body; pictures that are page furniture rather than
 * photographs are left out, and `shown` keeps a picture already set further up
 * from being set again — a photograph often runs on two or three pages of one
 * edition, and printing it three times over is what makes a run of pages read
 * as a jumble.
 */
export function toBlock(extra: StoryExtra, shown = new Set<string>()): ExtraBlock {
  const pieces = piecesFrom(extra.paragraphs);
  const at = headingFor(pieces);
  const title = at >= 0 ? pieces[at].text : undefined;
  const body = at >= 0 ? [...pieces.slice(0, at), ...pieces.slice(at + 1)] : pieces;
  return { title, pieces: body, images: platesFor(extra.images, shown) };
}

/**
 * Every printed page kept with one article, in printed order. A page whose
 * pictures have all been set further up and whose text is word for word a page
 * already set — the same advertisement, run twice in one edition — is left out
 * the second time.
 */
export function toBlocks(extras: StoryExtra[]): ExtraBlock[] {
  const shown = new Set<string>();
  const set = new Set<string>();
  const out: ExtraBlock[] = [];
  for (const extra of extras) {
    const block = toBlock(extra, shown);
    if (!block.title && !block.pieces.length && !block.images.length) continue;
    const words = key([block.title ?? "", ...block.pieces.map((p) => p.text)].join(" "));
    if (!block.images.length && words && set.has(words)) continue;
    set.add(words);
    out.push(block);
  }
  return out;
}
