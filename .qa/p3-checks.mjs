// Prompt 3 HTTP-level checks against the running production build.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { storyHref } from "./site-urls.mjs";

const BASE = process.argv[2] ?? "http://localhost:3123";
const SITE = "https://spiceroutemagazine.in";
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const load = async (name) => {
  const js = ts.transpileModule(await fs.readFile(`../src/data/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  await fs.writeFile(`tmp/p3-${name}.mjs`, js);
  return import(pathToFileURL(`tmp/p3-${name}.mjs`).href + `?t=${Date.now()}`);
};
const { editions } = await load("editions");
const { stories } = await load("stories");
const unverified = Object.values(JSON.parse(await fs.readFile("unverified-edition-descriptions.json", "utf8"))).filter(Boolean);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const key = (e) => e.year * 12 + MONTHS.indexOf(e.month);
const chrono = [...editions].sort((a, b) => key(b) - key(a)); // newest first

const results = [];
const check = (area, ok, detail) => results.push({ area, ok, detail });
const get = async (p) => { const r = await fetch(BASE + p); return { status: r.status, html: await r.text() }; };
// drop scripts (RSC payload) and React's text-node separators <!-- -->
const noScripts = (h) => h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/g, "").replace(/<!-- -->/g, "");
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1]?.replace(/&amp;/g, "&");
const canonicalOf = (html) => attr((html.match(/<link[^>]+rel="canonical"[^>]*>/) || [""])[0], "href");

// ---------- Editions ----------
const imgCache = new Map();
const imgOk = async (src) => {
  if (!imgCache.has(src)) {
    const r = await fetch(new URL(src.replace(/&amp;/g, "&"), BASE));
    imgCache.set(src, r.ok && /^image\//.test(r.headers.get("content-type") ?? ""));
    await r.arrayBuffer().catch(() => {});
  }
  return imgCache.get(src);
};
for (const [i, e] of chrono.entries()) {
  const path = `/inflight-magazine/${e.slug}`;
  const { status, html } = await get(path);
  const body = noScripts(html);
  const problems = [];
  if (status !== 200) problems.push(`HTTP ${status}`);
  if ((body.match(/<h1[\s>]/g) || []).length !== 1) problems.push("h1 count ≠ 1");
  const prev = attr((body.match(/<a[^>]+rel="prev"[^>]*>/) || [""])[0], "href");
  const next = attr((body.match(/<a[^>]+rel="next"[^>]*>/) || [""])[0], "href");
  const wantPrev = chrono[i + 1] ? `/inflight-magazine/${chrono[i + 1].slug}` : undefined;
  const wantNext = chrono[i - 1] ? `/inflight-magazine/${chrono[i - 1].slug}` : undefined;
  if (prev !== wantPrev) problems.push(`prev ${prev} ≠ ${wantPrev}`);
  if (next !== wantNext) problems.push(`next ${next} ≠ ${wantNext}`);
  if (!wantNext && !body.includes("This is the latest edition")) problems.push("latest edition end-state missing");
  if (!wantPrev && !body.includes("Oldest edition in the archive")) problems.push("oldest edition end-state missing");
  // cover (the eager hero image) must load and be this edition's cover
  const hero = (body.match(/<img[^>]+alt="Cover of [^"]+"[^>]*fetchpriority="high"[^>]*>|<img[^>]+fetchpriority="high"[^>]+alt="Cover of [^"]+"[^>]*>/i) || [""])[0];
  const heroSrc = attr(hero, "src");
  if (!heroSrc || !(await imgOk(heroSrc))) problems.push("cover image did not load");
  if (heroSrc && !decodeURIComponent(heroSrc).includes(e.cover.replace(/^https?:\/\/[^/]+/, ""))) problems.push("hero image is not this edition's cover");
  // every <img> on the page loads
  const imgs = [...body.matchAll(/<img[^>]+>/g)].map((m) => attr(m[0], "src")).filter(Boolean);
  for (const s of new Set(imgs)) if (!(await imgOk(s))) problems.push(`image fails: ${s.slice(0, 80)}`);
  // story links: exactly this edition's stories, each resolving
  const own = stories.filter((s) => s.editionSlug === e.slug);
  // story pages only (/stories/<category>/<story>), not the category pages
  // (/stories/<category>) that the header menu links to
  const links = [...new Set([...body.matchAll(/href="(\/stories\/[^"/]+\/[^"/?#]+)"/g)].map((m) => m[1]))];
  const expected = own.map((s) => storyHref(s));
  const missing = expected.filter((x) => !links.includes(x));
  const foreign = links.filter((x) => !expected.includes(x));
  if (missing.length) problems.push(`missing story links ${missing.join(",")}`);
  if (foreign.length) problems.push(`links to other editions' stories ${foreign.join(",")}`);
  for (const l of links) { const r = await fetch(BASE + l); if (r.status !== 200) problems.push(`story ${l} → ${r.status}`); await r.text(); }
  // contents order = printed order
  if (own.length) {
    const order = [...body.matchAll(/class="ed-toc__link" href="([^"]+)"|href="([^"]+)" class="ed-toc__link"/g)].map((m) => m[1] || m[2]);
    const want = [...own].sort((a, b) => a.source.pdfPages[0] - b.source.pdfPages[0]).map((s) => storyHref(s));
    if (JSON.stringify(order) !== JSON.stringify(want)) problems.push(`contents order ${order.join(" ")} ≠ printed order`);
  }
  // PDF CTA present, web vs PDF status explicit
  if (!/PDF reader/.test(body)) problems.push("no PDF viewer CTA");
  if (own.length === 0 && !body.includes("Full edition available as PDF")) problems.push("PDF-only status missing");
  if (own.length > 0 && !body.includes("Web stories available")) problems.push("web status missing");
  // SEO
  if (canonicalOf(html) !== `${SITE}${path}`) problems.push(`canonical ${canonicalOf(html)}`);
  if (!/<meta property="og:image"/.test(html)) problems.push("no og:image");
  if (/application\/ld\+json/.test(html)) problems.push("structured data on edition page");
  if (e.issue && !body.includes(String(e.issue))) problems.push("verified issue not shown");
  check("edition", problems.length === 0, `${e.slug.padEnd(15)} ${own.length ? `${own.length} web stories` : "PDF-only"} | prev ${wantPrev?.split("/").pop() ?? "—"} | next ${wantNext?.split("/").pop() ?? "—"}${problems.length ? " | " + problems.join("; ") : ""}`);
}

// ---------- Stories ----------
for (const s of stories) {
  const path = storyHref(s);
  const { status, html } = await get(path);
  const body = noScripts(html);
  const problems = [];
  if (status !== 200) problems.push(`HTTP ${status}`);
  if ((body.match(/<h1[\s>]/g) || []).length !== 1) problems.push("h1 count ≠ 1");
  const e = editions.find((x) => x.slug === s.editionSlug);
  // breadcrumb Home → Inflight Magazine → Edition → Story
  const crumbs = (body.match(/<nav[^>]*aria-label="Breadcrumb"[\s\S]*?<\/nav>/) || [""])[0];
  const crumbLinks = [...crumbs.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  if (JSON.stringify(crumbLinks) !== JSON.stringify(["/", "/inflight-magazine", `/inflight-magazine/${e.slug}`])) problems.push(`breadcrumb ${crumbLinks.join(" > ")}`);
  if (!body.includes(`From the ${e.month} ${e.year} edition`) && !body.includes(`${e.month} ${e.year} · Issue`) && !body.includes(`>${e.month} ${e.year}<`)) problems.push("edition label missing");
  // previous / next story follow printed order within the edition
  const sib = stories.filter((x) => x.editionSlug === s.editionSlug).sort((a, b) => a.source.pdfPages[0] - b.source.pdfPages[0]);
  const at = sib.findIndex((x) => x.slug === s.slug);
  const nav = (body.match(/<nav[^>]*aria-label="Story navigation"[\s\S]*?<\/nav>/) || [""])[0];
  const prev = attr((nav.match(/<a[^>]+rel="prev"[^>]*>/) || [""])[0], "href");
  const next = attr((nav.match(/<a[^>]+rel="next"[^>]*>/) || [""])[0], "href");
  const want = (x) => (x ? storyHref(x) : undefined);
  if (prev !== want(sib[at - 1])) problems.push(`prev story ${prev} ≠ ${want(sib[at - 1])}`);
  if (next !== want(sib[at + 1])) problems.push(`next story ${next} ≠ ${want(sib[at + 1])}`);
  // structured data: present, parseable, verified values only
  const ld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  let parsed = null;
  try { parsed = JSON.parse(ld); } catch { problems.push("JSON-LD missing or invalid"); }
  if (parsed) {
    const head = s.label ? `${s.title}: ${s.label}` : s.title;
    if (parsed.headline !== head) problems.push(`JSON-LD headline ${parsed.headline}`);
    if ((parsed.author?.name ?? undefined) !== s.author) problems.push("JSON-LD author mismatch");
    if (parsed.datePublished) problems.push("JSON-LD has an unverified date");
  }
  if (canonicalOf(html) !== `${SITE}${path}`) problems.push(`canonical ${canonicalOf(html)}`);
  if (!body.includes(s.title)) problems.push("printed headline not on page");
  check("story", problems.length === 0, `${s.slug.padEnd(44)} #${at + 1}/${sib.length} in ${s.editionSlug}${problems.length ? " | " + problems.join("; ") : ""}`);
}

// ---------- Other pages ----------
for (const [p, want] of [["/", "/"], ["/about", "/about"], ["/contact", "/contact"], ["/inflight-magazine", "/inflight-magazine"]]) {
  const { status, html } = await get(p);
  const c = canonicalOf(html);
  const expected = want === "/" ? SITE : `${SITE}${want}`;
  const ld = /application\/ld\+json/.test(html);
  check("page", status === 200 && (c === expected || c === `${SITE}/`) && !ld, `${p.padEnd(18)} ${status} canonical ${c}${ld ? " | has JSON-LD" : ""}`);
}

// ---------- No unverified edition descriptions anywhere ----------
let leaks = [];
for (const p of ["/", "/inflight-magazine", ...editions.map((e) => `/inflight-magazine/${e.slug}`)]) {
  const { html } = await get(p);
  for (const d of unverified) if (html.includes(d.slice(0, 40))) leaks.push(`${p}: "${d.slice(0, 50)}…"`);
}
check("content", leaks.length === 0, `unverified Prompt 1 edition descriptions rendered: ${leaks.length}${leaks.length ? " — " + leaks.slice(0, 3).join(" ; ") : ""}`);

// ---------- Archive ----------
{
  const { html } = await get("/inflight-magazine");
  const body = noScripts(html);
  const cards = (body.match(/class="ed-edition"/g) || []).length;
  const editionLinks = new Set([...body.matchAll(/href="(\/inflight-magazine\/[^"]+)"/g)].map((m) => m[1]));
  const allLinked = editions.every((e) => editionLinks.has(`/inflight-magazine/${e.slug}`));
  const imgs = [...body.matchAll(/<img[^>]+>/g)].map((m) => attr(m[0], "src")).filter(Boolean);
  let bad = 0; for (const s of new Set(imgs)) if (!(await imgOk(s))) bad++;
  check("archive", cards === editions.length && allLinked && bad === 0, `edition cards ${cards}/${editions.length}, all editions linked: ${allLinked}, broken images: ${bad}`);
}

await fs.writeFile("screenshots/p3-checks.json", JSON.stringify(results, null, 1));
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} [${r.area}] ${r.detail}`);
const fails = results.filter((r) => !r.ok);
console.log(fails.length ? `\n${fails.length} FAILED` : `\nP3 CHECKS: ALL ${results.length} PASS`);
