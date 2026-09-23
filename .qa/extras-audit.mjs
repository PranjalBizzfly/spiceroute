// Checks that every printed page kept as an "extra" really reaches the web
// page it was attached to: each printed paragraph must be in that page's text,
// and each picture must be served.
// Usage: node extras-audit.mjs [baseUrl]
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3123";
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const load = async (name) => {
  const js = ts.transpileModule(await fs.readFile(`../src/data/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from "@\/types";?/g, "");
  await fs.writeFile(`tmp/audit-${name}.mjs`, js);
  return import(pathToFileURL(`tmp/audit-${name}.mjs`).href + `?t=${Date.now()}`);
};
const { extras } = await load("extras");
const { stories } = await load("stories");
const { storyHref } = await import("./site-urls.mjs");
const href = Object.fromEntries(stories.map((s) => [s.slug, storyHref(s)]));

const norm = (s) =>
  s
    .replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

let pages = 0, units = 0, paras = 0, missing = 0, pictures = 0, badPics = 0;
const problems = [];
const imgCache = new Map();

for (const [slug, list] of Object.entries(extras)) {
  const path = href[slug];
  if (!path) { problems.push(`${slug}: story not in stories.ts`); continue; }
  const html = await (await fetch(BASE + path)).text();
  const text = norm(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " "));
  pages++;
  for (const x of list) {
    units++;
    for (const p of x.paragraphs) {
      paras++;
      const want = norm(p);
      if (want.length < 3) continue;
      if (!text.includes(want)) {
        missing++;
        problems.push(`${slug} p${x.pdfPage} [${x.label}]: "${p.slice(0, 70)}"`);
      }
    }
    for (const img of x.images) {
      pictures++;
      if (!imgCache.has(img.src)) {
        const r = await fetch(BASE + img.src);
        imgCache.set(img.src, r.ok);
        await r.arrayBuffer().catch(() => {});
      }
      if (!imgCache.get(img.src)) { badPics++; problems.push(`${slug}: picture missing ${img.src}`); }
    }
  }
}

console.log(`extras: ${units} printed pages on ${pages} article pages | ${paras} printed paragraphs | ${pictures} pictures`);
if (problems.length) {
  console.log(problems.slice(0, 25).join("\n"));
  console.log(`\n${missing} PARAGRAPH(S) MISSING, ${badPics} PICTURE(S) MISSING`);
} else {
  console.log("EXTRAS AUDIT: every printed paragraph and picture is on the web");
}
