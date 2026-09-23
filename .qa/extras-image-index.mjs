// The pictures cut out of the edition PDFs, measured once so the site can set
// them sensibly. Two things come out of it, written to src/data/extrasImages.ts:
//
//   junk   Pieces a page is *made* of rather than pictures printed on it: a
//          slice of the sky behind an advertisement, a flat panel of the page's
//          background colour, the black-and-white alpha mask that cut a model
//          out, the soft grey blob behind a product. Set beside real
//          photographs they read as scattered debris, so they are left out.
//          Measured on a 96x96 sample flattened onto white:
//            grad  average difference between neighbouring pixels — a flat
//                  panel or a gradient has almost none, a photograph plenty
//            sd    spread of tone — a near-solid fragment has little
//            mid   share of pixels neither near-black nor near-white, with
//                  sat (average colour): a two-tone colourless image is a mask
//
//   key    A perceptual hash (8x8 difference hash) of each picture, so the same
//          photograph printed on two pages of one edition is shown once rather
//          than three times over.
//
// Usage (from .qa/): node extras-image-index.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const root = path.resolve("..");
const src = fs.readFileSync(path.join(root, "src/data/extras.ts"), "utf8");
const extras = JSON.parse(src.slice(src.indexOf("= {") + 2, src.lastIndexOf("};") + 1));

const seen = new Map();
for (const block of Object.values(extras).flat()) for (const img of block.images) seen.set(img.src, img);

async function measure(file) {
  const W = 96;
  const { data } = await sharp(file).flatten({ background: "#ffffff" }).resize(W, W, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const grey = new Uint8Array(W * W);
  let sat = 0;
  let mid = 0;
  for (let i = 0; i < W * W; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    sat += Math.max(r, g, b) - Math.min(r, g, b);
    const v = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
    grey[i] = v;
    if (v > 40 && v < 215) mid++;
  }
  let sum = 0, sum2 = 0, grad = 0, pairs = 0;
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const v = grey[y * W + x];
      sum += v;
      sum2 += v * v;
      if (x + 1 < W) { grad += Math.abs(v - grey[y * W + x + 1]); pairs++; }
      if (y + 1 < W) { grad += Math.abs(v - grey[(y + 1) * W + x]); pairs++; }
    }
  // The middle of the picture, away from any border: a photograph has a
  // picture there, while a page's printed frame — or a group of photographs
  // stitched with the paper between them — has the paper.
  let centre = 0, centreWhite = 0;
  const edge = Math.round(W * 0.15);
  for (let y = edge; y < W - edge; y++)
    for (let x = edge; x < W - edge; x++) {
      centre++;
      if (grey[y * W + x] > 240) centreWhite++;
    }
  const n = W * W;
  const mean = sum / n;
  return { sd: Math.sqrt(sum2 / n - mean * mean), grad: grad / pairs, sat: sat / n, mid: mid / n, hollow: centreWhite / centre };
}

async function dhash(file) {
  const { data } = await sharp(file).flatten({ background: "#ffffff" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

/** Flat panel or gradient; near-solid; or a colourless two-tone mask. */
const isJunk = (m) => m.grad < 2 || m.sd < 16 || (m.mid < 0.25 && m.sat < 18 && m.grad < 8);

/**
 * A page whose background art was drawn in overlapping pieces — the world map
 * behind SpiceJet's "Our red hot routes", for instance — comes back from the
 * stitcher as slabs of colour laid over one another: recognisably not what was
 * printed. The page's own words carry what it said, so the slab is left out.
 *
 * Only stitched page composites are judged this way, and only flat ones: a
 * photograph can be this smooth (a building against a clear sky measures 2.9)
 * and is not a composite, so it is unaffected.
 */
const isBotchedComposite = (src, m) =>
  src.endsWith("-page.webp") &&
  // slabs of flat colour: the world map behind "Our red hot routes"
  (m.grad < 3.2 ||
    // or the soft grey blur a page puts behind a crest, assembled without the
    // crest itself: colourless and out of focus, where a photograph printed in
    // black and white still has edges (measured: the blur 3.7, photographs 8+)
    (m.sat < 8 && m.grad < 6) ||
    // or a printed border assembled without what it framed: colour around the
    // edges and blank paper in the middle, which is nothing to look at
    m.hollow > 0.85);

const junk = [];
const keys = [];
for (const [src, meta] of seen) {
  const file = path.join(root, "public", src);
  if (!fs.existsSync(file)) continue;
  // a fragment too small to print at a usable size is a leftover too, and one
  // several times taller than it is wide is a cut edge rather than a picture:
  // set in a row beside others it can only come out as a sliver
  const m = await measure(file);
  if (Math.min(meta.width, meta.height) < 120 || meta.width / meta.height < 0.25 || isJunk(m) || isBotchedComposite(src, m)) {
    junk.push(src);
    continue;
  }
  keys.push([src, await dhash(file)]);
}

junk.sort();
keys.sort((a, b) => (a[0] < b[0] ? -1 : 1));
const out = `import type { StoryExtra } from "@/types";

/**
 * What the pictures cut out of the edition PDFs turn out to be.
 *
 * \`junk\` lists the ones that are not pictures at all but the pieces a page is
 * made of: flat panels of a page's background, slices of sky behind an
 * advertisement, the black-and-white masks that cut a model out, the soft blob
 * of a drop shadow. They are left out of the printed pages shown on the web,
 * where they read as scattered debris.
 *
 * \`keys\` gives each remaining picture a perceptual hash, so a photograph
 * printed on more than one page of an edition is shown once.
 *
 * Generated by .qa/extras-image-index.mjs — do not edit by hand.
 */
const junk = new Set<string>([
${junk.map((s) => `  ${JSON.stringify(s)},`).join("\n")}
]);

const keys = new Map<string, string>([
${keys.map(([s, h]) => `  [${JSON.stringify(s)}, ${JSON.stringify(h)}],`).join("\n")}
]);

/** True when a picture is page furniture rather than a photograph. */
export const isJunkExtraImage = (img: StoryExtra["images"][number]) => junk.has(img.src);

/** What a picture shows, so the same photograph is recognised twice over. */
export const extraImageKey = (img: StoryExtra["images"][number]) => keys.get(img.src) ?? img.src;
`;
fs.writeFileSync(path.join(root, "src/data/extrasImages.ts"), out);
console.log(`pictures ${seen.size}, left out ${junk.length}, kept ${keys.length}`);
