// Contact sheets of the embedded images on each story's PDF pages, labelled
// with their refs, for choosing gallery images by eye.
// Usage: node story-sheets.mjs <edition>:<fromPage>-<toPage>:<name>[:left|right] [...]
// (left/right: only images placed on that half of a two-page spread)
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("../node_modules/sharp");

const T = 200, L = 18, COLS = 6;
await fs.mkdir("tmp/sheets", { recursive: true });
for (const arg of process.argv.slice(2)) {
  const [edition, range, name, half] = arg.split(":");
  const [a, b] = range.split("-").map(Number);
  const index = JSON.parse(await fs.readFile(`extract/img/${edition}/index.json`, "utf8"));
  const imgs = index.filter((i) => i.page >= a && i.page <= (b || a) && (!half || !i.placed || (half === "left" ? i.placed[2] < 560 : i.placed[2] + i.placed[0] > 630)));
  if (!imgs.length) { console.log(`${name}: no images`); continue; }
  const tiles = [];
  for (const i of imgs) {
    const ref = i.file.split("/").pop().replace(".jpg", "");
    const img = await sharp(i.file).resize(T, T, { fit: "contain", background: "#333" }).toBuffer();
    const lab = Buffer.from(`<svg width="${T}" height="${L}"><rect width="100%" height="100%" fill="#000"/><text x="3" y="13" font-size="11" font-family="Arial" fill="#fff">${ref} ${i.width}x${i.height} [${i.placed ? i.placed[0] + "x" + i.placed[1] + "pt" : ""}]</text></svg>`);
    tiles.push(await sharp({ create: { width: T, height: T + L, channels: 3, background: "#111" } }).composite([{ input: img, top: 0, left: 0 }, { input: lab, top: T, left: 0 }]).jpeg().toBuffer());
  }
  const rows = Math.ceil(tiles.length / COLS);
  await sharp({ create: { width: Math.min(tiles.length, COLS) * (T + 4), height: rows * (T + L + 4), channels: 3, background: "#555" } })
    .composite(tiles.map((t, k) => ({ input: t, left: (k % COLS) * (T + 4), top: Math.floor(k / COLS) * (T + L + 4) })))
    .jpeg({ quality: 75 })
    .toFile(`tmp/sheets/${name}.jpg`);
  console.log(`${name}: ${imgs.length} images → tmp/sheets/${name}.jpg`);
}
