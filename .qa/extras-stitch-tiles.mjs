// A picture printed across a page often reaches the PDF not as one file but as
// a grid of tiles, or as a photograph with a panel and a cut-out laid over it.
// Pulled out one by one and set in a row they read as a puzzle: sixteen squares
// of sky, a turquoise panel next to a turquoise frame.
//
// Every extracted picture was recorded with where it sits on the page
// (extract/img/<edition>/index.json, `placed` = [width, height, x, y] in
// points), so the pieces that touch on the page can be put back together and
// shown as the one picture a reader saw.
//
// Rewrites src/data/extras.ts in place. Run .qa/extras-image-index.mjs after it.
// Usage (from .qa/): node extras-stitch-tiles.mjs [--dry]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const root = path.resolve("..");
const dry = process.argv.includes("--dry");
const file = path.join(root, "src/data/extras.ts");
const source = fs.readFileSync(file, "utf8");
const head = source.slice(0, source.indexOf("= {") + 2);
const extras = JSON.parse(source.slice(source.indexOf("= {") + 2, source.lastIndexOf("};") + 1));

/** Pieces that touch on the page, within a couple of points, belong together. */
const TOL = 3;
/** …but only if together they fill this much of the area they span. */
const MIN_COVER = 0.72;
/** Blank margin around an assembled picture, trimmed to the same rule as the
    pictures build-extras.mjs writes, and never down to a sliver. */
const TRIM_THRESHOLD = 12;
const TRIM_FLOOR = 40;
const touches = (a, b) => {
  const [aw, ah, ax, ay] = a.placed;
  const [bw, bh, bx, by] = b.placed;
  return ax < bx + bw + TOL && bx < ax + aw + TOL && ay < by + bh + TOL && by < ay + ah + TOL;
};

const indexes = new Map();
const listFor = (edition) => {
  if (!indexes.has(edition)) {
    const f = `extract/img/${edition}/index.json`;
    indexes.set(edition, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : []);
  }
  return indexes.get(edition);
};
const indexFor = (edition) => new Map(listFor(edition).map((i) => [path.basename(i.file, ".jpg"), i]));
const cache = new Map();
const entryFor = (edition, ref) => {
  const k = edition + "/" + ref;
  if (!cache.has(k)) cache.set(k, indexFor(edition).get(ref));
  return cache.get(k);
};

const editionOf = (src) => src.split("/")[3];
const refOf = (src) => path.basename(src, ".webp");

let stitched = 0;
let replaced = 0;
/** Groups left as separate pictures, with the score that decided it. */
const split = [];

for (const blocks of Object.values(extras)) {
  for (const block of blocks) {
    // where each of this page's pictures sits, as far as the PDF recorded it
    const placed = block.images.map((img) => {
      const entry = entryFor(editionOf(img.src), refOf(img.src));
      return entry?.placed ? { img, placed: entry.placed } : null;
    });
    if (placed.some((p) => !p)) continue;

    // pieces that touch on the page, in the order the page paints them
    const group = placed.map((_, i) => i);
    for (let i = 0; i < placed.length; i++)
      for (let j = 0; j < i; j++)
        if (touches(placed[i], placed[j])) {
          const from = group[i];
          const to = group[j];
          if (from !== to) for (let k = 0; k < group.length; k++) if (group[k] === from) group[k] = to;
        }

    const out = [];
    const done = new Set();
    for (let i = 0; i < placed.length; i++) {
      if (done.has(group[i])) continue;
      const members = placed.filter((_, k) => group[k] === group[i]);
      done.add(group[i]);
      if (members.length < 2) {
        out.push(members[0].img);
        continue;
      }
      // the page's own arrangement, at the sharpest of the pieces' own scales
      const left = Math.min(...members.map((m) => m.placed[2]));
      const right = Math.max(...members.map((m) => m.placed[2] + m.placed[0]));
      const bottom = Math.min(...members.map((m) => m.placed[3]));
      const top = Math.max(...members.map((m) => m.placed[3] + m.placed[1]));
      const scale = Math.min(4, Math.max(...members.map((m) => m.img.width / m.placed[0])));
      const W = Math.round((right - left) * scale);
      const H = Math.round((top - bottom) * scale);
      if (W < 40 || H < 40 || W > 4000 || H > 4000) {
        for (const m of members) out.push(m.img);
        continue;
      }
      // Pieces that touch are not always one picture. A reader page prints
      // five separate selfies scattered across it, each corner meeting the
      // next; stitched into one plate they come out as a collage of ragged
      // photographs and white holes. A picture broken into tiles fills the
      // area it spans — so when the pieces leave most of it empty, they are
      // separate pictures and are shown separately.
      const edition = editionOf(members[0].img.src);
      const page = entryFor(edition, refOf(members[0].img.src)).page;
      const inside = listFor(edition).filter(
        (e) =>
          e.page === page &&
          e.placed &&
          e.placed[2] >= left - TOL &&
          e.placed[2] + e.placed[0] <= right + TOL &&
          e.placed[3] >= bottom - TOL &&
          e.placed[3] + e.placed[1] <= top + TOL
      );
      const covered = inside.reduce((sum, e) => sum + e.placed[0] * e.placed[1], 0);
      const coverage = covered / ((right - left) * (top - bottom));
      if (coverage < MIN_COVER) {
        // Recorded so the decision can be reviewed: once the pieces are left
        // separate, nothing in the output says they were ever considered one
        // picture, or how close the call was.
        split.push({
          edition: editionOf(members[0].img.src),
          page: entryFor(editionOf(members[0].img.src), refOf(members[0].img.src)).page,
          coverage: Number(coverage.toFixed(3)),
          pieces: members.map((m) => m.img.src.split("/").pop()),
        });
        for (const m of members) out.push(m.img);
        continue;
      }
      let size = { width: W, height: H };
      const name = `${refOf(members[0].img.src)}-page.webp`;
      const dir = path.join(root, "public/images/extras", editionOf(members[0].img.src));
      const rel = `/images/extras/${editionOf(members[0].img.src)}/${name}`;
      if (!dry) {
        // Every piece the page placed inside these bounds is painted, in the
        // order the page paints them — including the pieces that never reached
        // the data (a tile of plain sky, dropped for carrying no detail of its
        // own), which are exactly what would otherwise leave holes in it —
        // the same pieces the coverage test above was measured on.
        const layers = [];
        for (const e of inside) {
          const [w, h, x, y] = e.placed;
          const own = members.find((m) => refOf(m.img.src) === path.basename(e.file, ".jpg"));
          const from = own ? path.join(root, "public", own.img.src) : path.join(root, ".qa", e.file);
          if (!fs.existsSync(from)) continue;
          const buf = await sharp(from)
            .resize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), { fit: "fill" })
            .toBuffer();
          layers.push({ input: buf, left: Math.round((x - left) * scale), top: Math.round((top - (y + h)) * scale) });
        }
        // The pieces are painted on a white ground the size of the area they
        // span, so a picture set against the page's margin brings the margin
        // with it. Trimmed off, the picture fills its frame and can be laid
        // out as what it is; kept whole if trimming would leave a sliver.
        const plate = sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } }).composite(layers);
        let out2 = await plate.webp({ quality: 80, effort: 5 }).toBuffer({ resolveWithObject: true });
        try {
          const trimmed = await sharp(await plate.png().toBuffer())
            .trim({ threshold: TRIM_THRESHOLD })
            .webp({ quality: 80, effort: 5 })
            .toBuffer({ resolveWithObject: true });
          if (trimmed.info.width >= TRIM_FLOOR && trimmed.info.height >= TRIM_FLOOR) out2 = trimmed;
        } catch {
          // an even field of colour trims to nothing: keep the picture whole
        }
        size = { width: out2.info.width, height: out2.info.height };
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, name), out2.data);
      }
      out.push({ src: rel, ...size });
      stitched++;
      replaced += members.length;
    }
    block.images = out;
  }
}

if (!dry) fs.writeFileSync(file, `${head}${JSON.stringify(extras, null, 2)};\n`);
split.sort((a, b) => a.coverage - b.coverage);
fs.mkdirSync(path.join(root, ".qa/screenshots"), { recursive: true });
fs.writeFileSync(path.join(root, ".qa/screenshots/split-groups.json"), JSON.stringify(split, null, 1));
console.log(`${replaced} pieces put back together as ${stitched} pictures${dry ? " (dry run)" : ""}`);
console.log(`${split.length} groups left separate (coverage below ${MIN_COVER}) → screenshots/split-groups.json`);
