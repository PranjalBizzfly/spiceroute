// Extract embedded photographs from the edition PDFs (not page renders), so
// article images come straight from the official source files.
// Each image is recorded with where it is placed on the page (points), so
// icons and masks can be told apart from printed photographs.
// Output: extract/img/<edition>/p<page>-<n>.jpg  +  extract/img/<edition>/index.json
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const MIN_PIXELS = 150; // smallest pixel side worth keeping
const MIN_PIXELS_SMALL = 100; // …but small, sharply printed photographs down to this
const MIN_PLACED = 60; // smallest printed side in points (icons are ~25pt)
const editions = process.argv.slice(2);

const waitObj = (store, id) =>
  new Promise((resolve) => {
    try {
      store.get(id, resolve);
    } catch {
      resolve(null);
    }
  });
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

for (const edition of editions) {
  const outDir = `extract/img/${edition}`;
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  const data = new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`));
  const doc = await pdfjs.getDocument({ data, verbosity: 0, isOffscreenCanvasSupported: false }).promise;

  const index = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const ops = await page.getOperatorList();
    const seen = new Set();
    let k = 0;
    let ks = 0;
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === pdfjs.OPS.save) { stack.push(ctm); continue; }
      if (fn === pdfjs.OPS.restore) { ctm = stack.pop() ?? ctm; continue; }
      if (fn === pdfjs.OPS.transform) { ctm = mul(ctm, ops.argsArray[i]); continue; }
      if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintImageXObjectRepeat) continue;
      const id = ops.argsArray[i][0];
      if (seen.has(id)) continue;
      seen.add(id);
      const placed = [Math.round(Math.hypot(ctm[0], ctm[1])), Math.round(Math.hypot(ctm[2], ctm[3])), Math.round(ctm[4]), Math.round(ctm[5])];
      const img = await waitObj(id.startsWith("g_") ? page.commonObjs : page.objs, id);
      if (!img || !img.data) continue;
      if (Math.min(placed[0], placed[1]) < MIN_PLACED) continue;
      // Photographs printed small from low-resolution files (e.g. 234×142 px)
      // are kept too, numbered separately ("p66-s1") so the refs of the main
      // set never change.
      const small = Math.min(img.width, img.height) < MIN_PIXELS;
      if (small && Math.min(img.width, img.height) < MIN_PIXELS_SMALL) continue;

      const channels = img.kind === 3 ? 4 : img.kind === 2 ? 3 : 0;
      if (!channels) continue;
      const file = `${outDir}/p${String(n).padStart(2, "0")}-${small ? `s${++ks}` : ++k}.jpg`;
      await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
        raw: { width: img.width, height: img.height, channels },
      })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(file);
      index.push({ page: n, file, width: img.width, height: img.height, placed });
    }
    page.cleanup();
  }
  await fs.writeFile(`${outDir}/index.json`, JSON.stringify(index, null, 1));
  console.log(`${edition}: ${index.length} images across ${doc.numPages} pages`);
}
