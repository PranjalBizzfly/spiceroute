// Final content-integrity + route QA.
// Loads the real data modules (transpiled with the project's TypeScript) and
// checks every claim against the edition PDFs and the running production build.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const BASE = process.argv[2] ?? "http://localhost:3123";

async function load(name) {
  const src = await fs.readFile(`../src/data/${name}.ts`, "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const out = `tmp/${name}.mjs`;
  await fs.writeFile(out, js);
  return import(pathToFileURL(out).href + `?t=${Date.now()}`);
}
const { stories } = await load("stories");
const { editions } = await load("editions");
const { categories } = await load("categories");
const { siteConfig } = await load("siteConfig");

const norm = (s) => s.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, " ").replace(/-\s+/g, "").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const pdfText = {};
for (const ed of ["september-2026", "august-2026", "july-2026", "june-2026", "may-2026", "april-2026"]) {
  pdfText[ed] = norm(JSON.parse(await fs.readFile(`extract/${ed}.pages.json`, "utf8")).map((p) => p.text).join(" "));
}
const IDENTITY = {
  "welcome-aboard-september-2026": ["Welcome aboard SpiceJet", "Ajay Singh"],
  "kolkata-forever-day-in-a-city": ["Victoria Memorial", "New Market"],
  "ranveer-brar-conversation": ["Ranveer Brar", "Kashkan"],
  "five-monsoon-escapes-rain-kissed-splendour": ["Korlai", "Valparai"],
  "kitchen-healing-traditional-superfoods": ["Ryan Fernando", "amla"],
  "global-flavours-take-off": ["Nishant Choubey", "matcha"],
  "sweet-devotion-modak-traditions": ["modak", "kozhukattai"],
  "ladakh-roof-of-the-world": ["Ladakh", "Pangong"],
  "saving-the-greater-one-horned-rhino": ["World Rhino Day", "one-horned"],
  "my-hometown-gwalior": ["Pooja Bhadauria", "Gwalior"],
  "icons-of-new-india": ["Icons", "Chenab"],
  "from-estate-to-espresso": ["Bindu Gopal Rao", "coffee"],
  "sittong-orange-valley-hills": ["Sittong", "cinchona"],
  "my-hometown-wayanad": ["Asiya Farshana", "Wayanad"],
  "varanasi-the-eternal-city": ["Shibani Bawa", "Varanasi"],
  "day-in-a-city-pune": ["Ayushi Anand", "Pune"],
  "live-long-travel-longer": ["Manjulika Pramod", "longevity"],
  "japanese-desserts-india": ["Japanese", "mochi"],
  "fur-all-pet-yoga": ["Deepa Natarajan Lobo", "Pet Yoga"],
  "my-hometown-jaipur": ["Deepesh Sharma", "Jaipur"],
};
const results = [];
const check = (area, ok, detail) => results.push({ area, ok, detail });

// ---------- Inventory ----------
const slugs = stories.map((s) => s.slug);
check("inventory", stories.length === 55, `stories in data: ${stories.length} (20 Sept–July 2026 + 35 June–April 2026)`);
check("inventory", new Set(slugs).size === slugs.length, "story slugs unique");
// Duplicate ARTICLES (not shared headlines): the series headline "My Town" is
// printed on three different crew members' pieces.
const identity = stories.map((s) => `${s.title}|${s.author ?? ""}|${s.editionSlug}`);
check("inventory", new Set(identity).size === stories.length, "no duplicate articles (headline + byline + edition unique)");
const sharedTitles = Object.entries(stories.reduce((a, s) => ((a[s.title] = (a[s.title] ?? 0) + 1), a), {})).filter(([, n]) => n > 1);
console.log(`info: printed headlines shared by different articles: ${sharedTitles.map(([t, n]) => `"${t}" ×${n}`).join(", ") || "none"}`);
check("inventory", editions.length === 29, `editions in data: ${editions.length}`);
check("inventory", new Set(editions.map((e) => e.slug)).size === 29, "edition slugs unique");

// ---------- Per-story mappings ----------
const catSlugs = new Set(categories.map((c) => c.slug));
for (const s of stories) {
  const ed = editions.find((e) => e.slug === s.editionSlug);
  const text = pdfText[s.editionSlug];
  const problems = [];
  if (!catSlugs.has(s.category)) problems.push(`unknown category ${s.category}`);
  if (!ed) problems.push(`unknown edition ${s.editionSlug}`);
  else if (ed.title !== s.editionTitle) problems.push(`editionTitle "${s.editionTitle}" ≠ "${ed.title}"`);
  // edition↔story relation is derived in src/lib/content.ts (p3-checks verifies each edition page lists its stories)
  if (!text) problems.push("no PDF text for its edition");
  else {
    if (s.author && !text.includes(norm(s.author))) problems.push(`author "${s.author}" not in PDF`);
    if (s.role && !text.includes(norm(s.role))) problems.push(`role "${s.role}" not in PDF`);
    // identity: hand-picked keywords where defined; otherwise the standfirst
    // (or, for pieces without one, the first paragraph) must be printed verbatim
    // (a six-word phrase from its opening, past any drop cap or first line)
    const opening = (s.excerpt || s.body.find((b) => b.type === "p")?.text || s.title).replace(/\*+/g, "").split(" ").slice(2, 8).join(" ");
    const kw = IDENTITY[s.slug] ?? [opening];
    if (!kw.every((k) => text.includes(norm(k)))) problems.push(`identity text missing from PDF: ${kw.filter((k) => !text.includes(norm(k))).map((k) => k.slice(0, 60)).join(", ")}`);
  }
  // Pieces printed without a photograph (Predictions) carry no image
  if (s.heroImage || s.section !== "Predictions") {
    if (!s.heroImage?.startsWith("/images/stories/")) problems.push(`image not a verified article image: ${s.heroImage}`);
    else {
      try { await fs.access(`../public${s.heroImage}`); } catch { problems.push(`image file missing ${s.heroImage}`); }
    }
    if (!s.heroImageAlt) problems.push("no alt text");
    if (!s.heroImageSource?.includes(ed?.title ?? "??")) problems.push(`image source "${s.heroImageSource}" not from its own edition`);
  }
  check("story", problems.length === 0, `${s.slug}${problems.length ? " — " + problems.join("; ") : ""}`);
}
for (const e of editions) {
  const n = stories.filter((s) => s.editionSlug === e.slug).length;
  if (n) check("edition-map", true, `${e.slug}: ${n} web stories (derived)`);
}

// ---------- Restored article must be verbatim ----------
const welcome = stories.find((s) => s.slug === "welcome-aboard-september-2026");
const sh = (t) => { const w = norm(t).split(" "); const o = []; for (let i = 0; i + 5 <= w.length; i++) o.push(w.slice(i, i + 5).join(" ")); return o; };
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const sepDoc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile("pdf/september-2026.pdf")), verbosity: 0 }).promise;
const p4 = (await (await sepDoc.getPage(4)).getTextContent()).items.map((i) => i.str + (i.hasEOL ? " " : "")).join("");
const pdfSh = new Set(sh(p4));
const wSh = sh(welcome.body.map((b) => b.text ?? b.items.join(" ")).join(" "));
const wScore = wSh.filter((x) => pdfSh.has(x)).length / wSh.length;
check("restored", wScore > 0.98, `Welcome Aboard body matches PDF verbatim: ${(wScore * 100).toFixed(1)}% of 5-word phrases`);

// ---------- Homepage discovery: every story exactly once ----------
const home = await (await fetch(BASE + "/")).text();
const stripScripts = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "");
const bodyOnly = stripScripts(home); // real links only, not the RSC payload
for (const s of stories) {
  const n = (bodyOnly.match(new RegExp(`href="/stories/${s.category}/${s.slug}"`, "g")) || []).length;
  check("homepage", n === 1, `${s.slug} linked ${n}x`);
}
check("homepage", !/unsplash|pexels|picsum|placeholder/i.test(home), "no stock/placeholder image hosts");

// ---------- Routes ----------
const routes = ["/", "/about", "/contact", "/inflight-magazine", ...editions.map((e) => `/inflight-magazine/${e.slug}`), ...stories.map((s) => `/stories/${s.category}/${s.slug}`)];
let bad = [];
for (const r of routes) { const res = await fetch(BASE + r); await res.arrayBuffer(); if (res.status !== 200) bad.push(`${res.status} ${r}`); }
check("routes", bad.length === 0, `${routes.length} routes (4 pages + ${editions.length} editions + ${stories.length} articles) — ${bad.length ? bad.join(", ") : "all 200"}`);
const bogus = await fetch(BASE + "/stories/travel/not-a-real-article");
check("routes", bogus.status === 404, `unknown article slug returns ${bogus.status}`);
const bogusEd = await fetch(BASE + "/inflight-magazine/not-an-edition");
check("routes", bogusEd.status === 404, `unknown edition slug returns ${bogusEd.status}`);

// ---------- PDFs + media kit ----------
const pdfFails = [];
await Promise.all(editions.map(async (e) => { const r = await fetch(e.pdfUrl, { method: "HEAD" }); if (r.status !== 200) pdfFails.push(`${r.status} ${e.slug}`); }));
check("pdf", pdfFails.length === 0, `${editions.length} edition PDFs — ${pdfFails.length ? pdfFails.join(", ") : "all 200"}`);
const mk = await fetch(siteConfig.spiceJet.mediaKitUrl, { method: "HEAD" });
check("pdf", mk.status === 200 && /pdf/.test(mk.headers.get("content-type") ?? ""), `media kit ${mk.status} ${mk.headers.get("content-type")} ${siteConfig.spiceJet.mediaKitUrl}`);
const allSrc = (await Promise.all(["../src/app/page.tsx", "../src/app/about/page.tsx", "../src/components/Footer.tsx", "../src/data/siteConfig.ts"].map((f) => fs.readFile(f, "utf8")))).join("\n");
check("pdf", !allSrc.includes("/2025/11/SpiceRoute-Mediakit-2025.pdf"), "broken /2025/11/ media-kit URL fully removed");

// ---------- Every link on key pages resolves ----------
for (const page of ["/", "/about", "/contact", "/inflight-magazine/september-2026", "/stories/welcome-aboard/welcome-aboard-september-2026"]) {
  // <link> tags (canonical, preload…) are metadata, not links a visitor follows;
  // canonical URLs point at the production domain, checked in p3-checks.
  const html = stripScripts(await (await fetch(BASE + page)).text()).replace(/<link\b[^>]*>/g, "");
  const hrefs = [...new Set([...html.matchAll(/\shref="([^"#]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")))].filter((h) => !h.startsWith("/_next") && !/\.(css|woff2?|ico)$/.test(h) && !/^(mailto|tel):/.test(h));
  const fails = [];
  for (const h of hrefs) {
    const url = h.startsWith("/") ? BASE + h : h;
    try {
      let r = await fetch(url, { method: "HEAD", redirect: "follow" });
      if ([403, 405, 999].includes(r.status)) r = await fetch(url, { redirect: "follow" });
      if (r.status >= 400 && ![403, 999].includes(r.status)) fails.push(`${r.status} ${h}`);
    } catch (e) { fails.push(`ERR ${h}`); }
  }
  check("links", fails.length === 0, `${page}: ${hrefs.length} links — ${fails.length ? fails.join(", ") : "all resolve"}`);
}

await fs.writeFile("screenshots/final-checks.json", JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
for (const r of results) if (!r.ok || ["inventory", "restored", "routes", "pdf", "links", "edition-map"].includes(r.area)) console.log(`${r.ok ? "PASS" : "FAIL"}  [${r.area}] ${r.detail}`);
console.log(`\nstory mapping checks: ${results.filter((r) => r.area === "story" && r.ok).length}/${stories.length} pass | homepage exactly-once: ${results.filter((r) => r.area === "homepage" && r.ok).length}/${stories.length + 1} pass`);
console.log(failed.length ? `\n${failed.length} FAILED CHECK(S)` : "\nALL CHECKS PASS");
