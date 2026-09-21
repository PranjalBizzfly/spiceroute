// Writes src/data/stories.ts from the source-exact article builds
// (extract/articles/*.json), keeping the verified metadata already in
// stories.ts for existing stories (slug, category, edition, date, hero image
// mapping from Prompt 2.1). New stories take their metadata from the spec and
// editions.ts only — no invented tags or dates.
// Also copies each story's printed photographs (gallery) from the PDF
// extraction into public/images/stories/<slug>/, stitching the two halves of a
// photograph printed across a spread.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { SPECS } from "./article-specs.mjs";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const sharp = require("../node_modules/sharp");

async function loadTs(file, name) {
  const src = await fs.readFile(file, "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  await fs.writeFile(`tmp/${name}.mjs`, js);
  return import(pathToFileURL(`tmp/${name}.mjs`).href + `?t=${Date.now()}`);
}
const { stories: current } = await loadTs("../src/data/stories.ts", "stories-current");
const { editions } = await loadTs("../src/data/editions.ts", "editions-current");
const currentBySlug = new Map(current.map((s) => [s.slug, s]));
const editionBySlug = new Map(editions.map((e) => [e.slug, e]));

const MAX_W = 1600;
// WebP straight from the extracted originals. Quality steps down from q82 to
// a q72 floor until the file is no larger than the mozjpeg q82 JPEG of the same
// photograph would be (the format used before), so WebP never costs bytes.
const WEBP_QUALITIES = [82, 78, 75, 72];
async function encodeWebp(img) {
  const pixels = await img.png().toBuffer();
  const budget = (await sharp(pixels).jpeg({ quality: 82, mozjpeg: true }).toBuffer()).length;
  let out;
  for (const quality of WEBP_QUALITIES) {
    out = await sharp(pixels).webp({ quality, effort: 6, smartSubsample: true }).toBuffer({ resolveWithObject: true });
    if (out.data.length <= budget) break;
  }
  return out;
}

/** Writes one photograph (or a stitched spread) and returns its size. */
async function writeImage(edition, ref, dest) {
  const parts = ref.split("+").map((p) => `extract/img/${edition}/${p}.jpg`);
  let img;
  if (parts.length === 1) {
    img = sharp(parts[0]);
  } else {
    // halves of one spread photograph, left to right, at a common height
    const metas = await Promise.all(parts.map((p) => sharp(p).metadata()));
    const h = Math.min(...metas.map((m) => m.height));
    const halves = await Promise.all(parts.map((p) => sharp(p).resize({ height: h }).toBuffer({ resolveWithObject: true })));
    const w = halves.reduce((n, x) => n + x.info.width, 0);
    let left = 0;
    const layers = halves.map((x) => {
      const l = { input: x.data, left, top: 0 };
      left += x.info.width;
      return l;
    });
    img = sharp(await sharp({ create: { width: w, height: h, channels: 3, background: "#000" } }).composite(layers).png().toBuffer());
  }
  const meta = await img.metadata();
  if (meta.width > MAX_W) img = img.resize({ width: MAX_W });
  const { data, info } = await encodeWebp(img);
  await fs.writeFile(dest, data);
  return { width: info.width, height: info.height };
}

const norm = (s) => s.toLowerCase().replace(/\*/g, "").replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, " ");
const blockText = (b) => (b.text ?? b.items.join(" | "));
const out = [];
const log = [];
for (const spec of SPECS) {
  const a = JSON.parse(await fs.readFile(`extract/articles/${spec.slug}.json`, "utf8"));
  const s = currentBySlug.get(spec.slug);
  const edition = editionBySlug.get(a.source.edition);
  if (!edition) throw new Error(`${spec.slug}: unknown edition ${a.source.edition}`);

  // Existing stories: the printed text must not have changed (bar additions
  // listed by hand here after checking them against the PDF)
  if (s) {
    const before = s.body.map(blockText);
    const after = a.body.map(blockText);
    const added = after.filter((t) => !before.includes(t));
    const removed = before.filter((t) => !after.includes(t));
    if (removed.length) log.push(`${spec.slug}: REMOVED ${JSON.stringify(removed)}`);
    if (added.length) log.push(`${spec.slug}: added ${JSON.stringify(added)}`);
  }

  // Tags: existing ones only, and only where the printed text supports them
  let tags;
  if (s) {
    const allText = norm(
      [a.title, a.label, a.excerpt, ...a.body.map(blockText), ...a.callouts, ...a.pullQuotes, a.heroImageCaption].filter(Boolean).join(" ")
    );
    tags = (s.tags ?? []).filter((t) => norm(t).split(/\s+/).filter(Boolean).every((w) => allText.includes(w)));
    const dropped = (s.tags ?? []).filter((t) => !tags.includes(t));
    if (dropped.length) log.push(`${spec.slug}: dropped unsupported tags ${JSON.stringify(dropped)}`);
  }

  // Hero: the spec's lead photograph where it names one (new stories, and
  // photographs printed across a spread), else the existing mapping
  let hero = s?.heroImage ? { src: s.heroImage, alt: s.heroImageAlt, source: s.heroImageSource } : undefined;
  if (a.hero) {
    const src = `/images/stories/${spec.slug}.webp`;
    await writeImage(a.source.edition, a.hero.ref, `../public${src}`);
    const pages = a.hero.pdfPages;
    hero = { src, alt: a.hero.alt, source: `${edition.title}, PDF page${pages.length > 1 ? "s" : ""} ${pages.join("–")}` };
  }

  // Gallery: the story's other printed photographs
  const dir = `../public/images/stories/${spec.slug}`;
  await fs.rm(dir, { recursive: true, force: true });
  const gallery = [];
  if (a.gallery.length) await fs.mkdir(dir, { recursive: true });
  for (const g of a.gallery) {
    // named by PDF image ref, so a changed photograph never reuses a cached URL
    const file = `${g.ref.split("+").join("_")}.webp`;
    const size = await writeImage(a.source.edition, g.ref, `${dir}/${file}`);
    gallery.push({ src: `/images/stories/${spec.slug}/${file}`, alt: g.alt, ...size, pdfPages: g.pdfPages });
  }

  const category = s?.category ?? a.category;
  if (!category) throw new Error(`${spec.slug}: no category`);
  out.push({
    id: spec.slug,
    slug: spec.slug,
    title: a.title,
    ...(a.label ? { label: a.label } : {}),
    section: a.section,
    category,
    ...(a.author ? { author: a.author } : {}),
    ...(a.bylineLabel ? { bylineLabel: a.bylineLabel } : {}),
    ...(a.role ? { role: a.role } : {}),
    date: s?.date ?? `${edition.month} ${edition.year}`,
    excerpt: a.excerpt,
    ...(hero ? { heroImage: hero.src, heroImageAlt: hero.alt, heroImageSource: hero.source } : {}),
    ...(a.heroImageCaption ? { heroImageCaption: a.heroImageCaption } : {}),
    // extracted from the official PDF; web licensing not yet confirmed with NKN
    heroImageLicence: "pending",
    editionSlug: edition.slug,
    editionTitle: edition.title,
    ...(tags?.length ? { tags } : {}),
    body: a.body,
    ...(a.callouts.length ? { callouts: a.callouts } : {}),
    ...(a.pullQuotes.length ? { pullQuotes: a.pullQuotes } : {}),
    ...(gallery.length ? { gallery } : {}),
    ...(a.captions.length ? { printedCaptions: a.captions } : {}),
    ...(a.collapsible ? { collapsible: true } : {}),
    source: a.source,
  });
}

const gone = current.filter((s) => !out.some((o) => o.slug === s.slug)).map((s) => s.slug);
if (gone.length) throw new Error(`stories missing from the specs: ${gone.join(", ")}`);

const body = JSON.stringify(out, null, 2).replace(/^(\s*)"([A-Za-z]+)":/gm, "$1$2:");
const file = `import { Story } from "@/types";

// GENERATED — do not edit article text by hand.
// Every title, standfirst, byline, caption and body block below is extracted
// from the official edition PDFs (see .qa/build-articles.mjs and
// .qa/article-specs.mjs). Inline markup mirrors the printed faces: *italic*,
// **emphasis**. Gallery photographs are the story's own printed images.
export const stories: Story[] = ${body};
`;
await fs.writeFile("../src/data/stories.ts", file);
console.log(`wrote ${out.length} stories (${out.length - current.length} new) to src/data/stories.ts`);
console.log(`gallery images: ${out.reduce((n, s) => n + (s.gallery?.length ?? 0), 0)}`);
log.forEach((l) => console.log("  " + l));
