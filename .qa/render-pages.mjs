// Render PDF pages exactly as printed (pdf.js inside the local Chromium),
// so layout questions are answered from the real page, not from text dumps.
// Usage: node render-pages.mjs <edition> <page> [<page> ...]
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const [edition, ...pages] = process.argv.slice(2);
const root = path.resolve(".");
const types = { ".mjs": "text/javascript", ".js": "text/javascript", ".pdf": "application/pdf", ".html": "text/html" };

const server = http
  .createServer(async (req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    try {
      res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(0);
const port = server.address().port;

await fs.writeFile(
  "tmp/render.html",
  `<!doctype html><body style="margin:0;background:#fff"><canvas id="c"></canvas><script type="module">
    import * as pdfjs from "/node_modules/pdfjs-dist/build/pdf.mjs";
    pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
    const doc = await pdfjs.getDocument("/pdf/${edition}.pdf").promise;
    window.renderPage = async (n) => {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: ${Number(process.env.RENDER_SCALE || 1.6)} });
      const c = document.getElementById("c");
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      return [c.width, c.height];
    };
    window.ready = true;
  </script></body>`
);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/tmp/render.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
await fs.mkdir("extract/renders", { recursive: true });
for (const n of pages) {
  const [w, h] = await page.evaluate((p) => window.renderPage(p), Number(n));
  await page.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) });
  const out = `extract/renders/${edition}-p${n}.png`;
  await page.locator("#c").screenshot({ path: out });
  console.log("rendered", out);
}
await browser.close();
server.close();
