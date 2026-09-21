// For each edition PDF (read remotely with HTTP range requests, not fully
// downloaded): page count, a render of page 1 (the printed cover), and the
// masthead line "Vol. No. X | Issue Y | Month Year" from the opening pages.
// Output: extract/covers/<slug>-p1.png and extract/edition-facts.json
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const js = ts.transpileModule(await fs.readFile("../src/data/editions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
await fs.writeFile("tmp/facts-editions.mjs", js);
const { editions } = await import(pathToFileURL(path.resolve("tmp/facts-editions.mjs")).href);

const only = process.argv.slice(2);
const root = path.resolve(".");
const ALLOWED = "https://spiceroutemagazine.in/wp-content/uploads/";

const server = http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/remote") {
      const target = url.searchParams.get("u");
      if (!target?.startsWith(ALLOWED)) return res.writeHead(403).end();
      const ac = new AbortController();
      req.on("close", () => ac.abort());
      try {
        const up = await fetch(target, { headers: req.headers.range ? { Range: req.headers.range } : {}, signal: ac.signal });
        const headers = { "content-type": "application/pdf", "accept-ranges": "bytes" };
        for (const h of ["content-length", "content-range"]) if (up.headers.get(h)) headers[h] = up.headers.get(h);
        res.writeHead(up.status, headers);
        Readable.fromWeb(up.body).on("error", () => {}).pipe(res);
      } catch {
        if (!res.headersSent) res.writeHead(502);
        res.end();
      }
      return;
    }
    const file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    try {
      const type = file.endsWith(".mjs") ? "text/javascript" : "text/html";
      res.writeHead(200, { "content-type": type });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(0);
const port = server.address().port;

await fs.writeFile(
  "tmp/facts.html",
  `<!doctype html><body style="margin:0"><canvas id="c"></canvas><script type="module">
  import * as pdfjs from "/node_modules/pdfjs-dist/build/pdf.mjs";
  pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
  window.inspect = async (remote) => {
    const doc = await pdfjs.getDocument({ url: "/remote?u=" + encodeURIComponent(remote), rangeChunkSize: 262144, disableAutoFetch: true, disableStream: true }).promise;
    const p1 = await doc.getPage(1);
    const vp = p1.getViewport({ scale: 1.8 });
    const c = document.getElementById("c");
    c.width = vp.width; c.height = vp.height;
    await p1.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    const texts = [];
    for (let n = 1; n <= Math.min(doc.numPages, Number(new URLSearchParams(location.search).get("pages") || 16)); n++) {
      const tc = await (await doc.getPage(n)).getTextContent();
      texts.push(tc.items.map((i) => i.str).join(" "));
    }
    return { numPages: doc.numPages, width: c.width, height: c.height, texts };
  };
  window.ready = true;
  </script></body>`
);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/tmp/facts.html?pages=${process.env.SCAN_PAGES || 16}`);
await page.waitForFunction(() => window.ready === true);
await fs.mkdir("extract/covers", { recursive: true });

const facts = JSON.parse(await fs.readFile("extract/edition-facts.json", "utf8").catch(() => "{}"));
for (const e of editions) {
  if (only.length && !only.includes(e.slug)) continue;
  if (!only.length && facts[e.slug]) continue;
  try {
    const r = await page.evaluate((u) => window.inspect(u), e.pdfUrl);
    await page.setViewportSize({ width: r.width, height: r.height });
    await page.locator("#c").screenshot({ path: `extract/covers/${e.slug}-p1.png` });
    const all = r.texts.join(" \n ").replace(/\s+/g, " ");
    const m = all.match(/(?:Vol\.?\s*No\.?|Volume)\s*(\d+)\s*\|\s*Issue\s*(\d+)\s*\|\s*([A-Za-z]+)\s*(\d{4})/i);
    const ctx = [...all.matchAll(/(Vol[\s.]|Volume|Issue\s*(No\.?)?\s*\d)/gi)].slice(0, 4).map((x) => all.slice(Math.max(0, x.index - 30), x.index + 70));
    facts[e.slug] = {
      numPages: r.numPages,
      volIssueContext: ctx,
      masthead: m ? { volume: Number(m[1]), issue: Number(m[2]), month: m[3], year: Number(m[4]) } : null,
      mastheadRaw: m ? m[0] : null,
    };
    console.log(`${e.slug.padEnd(16)} pages ${String(r.numPages).padStart(3)} | ${m ? m[0] : "no masthead line found"}`);
  } catch (err) {
    console.log(`${e.slug.padEnd(16)} ERROR ${err.message.slice(0, 120)}`);
  }
  await fs.writeFile("extract/edition-facts.json", JSON.stringify(facts, null, 1));
}
await browser.close();
server.close();
