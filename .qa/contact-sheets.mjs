// Build one labelled contact sheet per story from the images on its PDF pages,
// so every candidate photo can be checked by eye against its article.
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

export const STORY_PAGES = {
  "welcome-aboard-spicejet-september-2026": ["september-2026", [4]],
  "kolkata-forever-day-in-a-city": ["september-2026", [33, 34, 35, 36, 37]],
  "ranveer-brar-conversation": ["september-2026", [58, 59, 60, 61, 62]],
  "five-monsoon-escapes-rain-kissed-splendour": ["september-2026", [45, 46, 47, 48, 49, 50]],
  "kitchen-healing-traditional-superfoods": ["september-2026", [50, 51, 52, 53]],
  "global-flavours-take-off": ["september-2026", [37, 38, 39, 40, 41]],
  "sweet-devotion-modak-traditions": ["september-2026", [54, 55, 56, 57]],
  "ladakh-roof-of-the-world": ["september-2026", [67, 68, 69, 70, 71, 72]],
  "saving-the-greater-one-horned-rhino": ["september-2026", [63, 64, 65, 66]],
  "my-hometown-gwalior": ["september-2026", [73, 74, 75]],
  "icons-of-new-india": ["august-2026", [51, 52, 53, 54, 55]],
  "from-estate-to-espresso": ["august-2026", [56, 57, 58, 59, 60]],
  "sittong-orange-valley-hills": ["august-2026", [64, 65, 66, 67, 68]],
  "my-hometown-wayanad": ["august-2026", [73, 74, 75]],
  "varanasi-the-eternal-city": ["july-2026", [54, 55, 56, 57, 58]],
  "day-in-a-city-pune": ["july-2026", [41, 42, 43, 44]],
  "live-long-travel-longer": ["july-2026", [50, 51, 52, 53, 54, 55]],
  "japanese-desserts-india": ["july-2026", [61, 62, 63, 64]],
  "fur-all-pet-yoga": ["july-2026", [66, 67, 68, 69]],
  "my-hometown-jaipur": ["july-2026", [73, 74, 75]],
};

const THUMB = 260;
const COLS = 5;

if (process.argv[1].endsWith("contact-sheets.mjs")) {
  await fs.mkdir("extract/sheets", { recursive: true });
  const only = process.argv.slice(2);
  for (const [slug, [edition, pages]] of Object.entries(STORY_PAGES)) {
    if (only.length && !only.includes(slug)) continue;
    const index = JSON.parse(await fs.readFile(`extract/img/${edition}/index.json`, "utf8"));
    const imgs = index.filter((i) => pages.includes(i.page));
    if (!imgs.length) {
      console.log(`${slug}: no images on pages ${pages.join(",")}`);
      continue;
    }
    const tiles = await Promise.all(
      imgs.map(async (im) => {
        const label = `p${im.page} ${im.file.split("/").pop()} ${im.width}x${im.height}`;
        const photo = await sharp(im.file).resize(THUMB, THUMB, { fit: "contain", background: "#222" }).toBuffer();
        const svg = Buffer.from(
          `<svg width="${THUMB}" height="24"><rect width="100%" height="100%" fill="#000"/><text x="6" y="17" font-size="14" font-family="Arial" fill="#fff">${label}</text></svg>`
        );
        return sharp({ create: { width: THUMB, height: THUMB + 24, channels: 3, background: "#222" } })
          .composite([{ input: photo, top: 0, left: 0 }, { input: svg, top: THUMB, left: 0 }])
          .jpeg()
          .toBuffer();
      })
    );
    const rows = Math.ceil(tiles.length / COLS);
    const W = COLS * (THUMB + 6);
    const H = rows * (THUMB + 30);
    await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % COLS) * (THUMB + 6), top: Math.floor(i / COLS) * (THUMB + 30) })))
      .jpeg({ quality: 80 })
      .toFile(`extract/sheets/${slug}.jpg`);
    console.log(`${slug}: ${imgs.length} candidates -> extract/sheets/${slug}.jpg`);
  }
}
