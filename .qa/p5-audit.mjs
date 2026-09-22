// Prompt 5 launch audit (HTTP level, production build):
// sitemap + robots, every internal link and #anchor on every page, external
// links, per-page metadata (title, description, canonical, Open Graph,
// Twitter), JSON-LD, headings, images/alt, unknown-route status codes, and a
// scan of the client bundles for leaked server secrets.
// Usage: node p5-audit.mjs [baseUrl]
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { storyHref } from "./site-urls.mjs";

const BASE = process.argv[2] ?? "http://localhost:3123";
const SITE = "https://spiceroutemagazine.in";
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");

async function load(name) {
  const src = await fs.readFile(`../src/data/${name}.ts`, "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  await fs.writeFile(`tmp/${name}.mjs`, js);
  return import(pathToFileURL(path.resolve(`tmp/${name}.mjs`)).href + `?t=${Date.now()}`);
}
const { stories } = await load("stories");
const { editions } = await load("editions");

const results = [];
const check = (area, ok, detail) => results.push({ area, ok, detail });
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i")); return m ? decode(m[1]) : undefined; };
const meta = (html, key) => { const t = html.match(new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]*>`, "i")); return t ? attr(t[0], "content") : undefined; };
const bodyOf = (html) => html.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/g, "").replace(/<!-- -->/g, "");

// ---------------------------------------------------------------------------
// 1. robots.txt and sitemap
// ---------------------------------------------------------------------------
const robots = await (await fetch(BASE + "/robots.txt")).text();
check("robots", /User-Agent: \*/i.test(robots) && /Allow: \/\s/.test(robots) && !/Disallow: \/\s*$/m.test(robots) && robots.includes(`Sitemap: ${SITE}/sitemap.xml`),
  `robots.txt allows the site, disallows only /api/, points at ${SITE}/sitemap.xml`);

const sitemapXml = await (await fetch(BASE + "/sitemap.xml")).text();
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expected = ["/", "/inflight-magazine", "/about", "/contact", ...editions.map((e) => `/inflight-magazine/${e.slug}`), ...stories.map((s) => storyHref(s))];
const toPath = (u) => (u === SITE ? "/" : u.replace(SITE, ""));
check("sitemap", locs.length === expected.length && new Set(locs).size === locs.length, `${locs.length} URLs, ${new Set(locs).size} unique (expected ${expected.length})`);
check("sitemap", locs.every((u) => u === SITE || u.startsWith(SITE + "/")), "every URL on the canonical origin");
check("sitemap", expected.every((p) => locs.map(toPath).includes(p)), "every page, edition and story is listed");
check("sitemap", !/lastmod|localhost|127\.0\.0\.1|vercel\.app/.test(sitemapXml), "no lastmod dates, no development hosts");

// ---------------------------------------------------------------------------
// 2. Pages: metadata, headings, links, images
// ---------------------------------------------------------------------------
const pages = expected;
const titles = new Map();
const internal = new Map(); // href → first page that links it
const external = new Map();
const anchors = []; // [page, href]
const imgs = new Map();
const pageHtml = new Map();

for (const p of pages) {
  const res = await fetch(BASE + p, { redirect: "manual" });
  const html = await res.text();
  pageHtml.set(p, html);
  const body = bodyOf(html);
  const problems = [];
  if (res.status !== 200) problems.push(`HTTP ${res.status}`);

  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? "");
  if (!title) problems.push("no <title>");
  titles.set(title, [...(titles.get(title) ?? []), p]);
  const description = meta(html, "description");
  if (!description || description.length < 40) problems.push(`weak description "${description}"`);
  const canonical = attr((html.match(/<link[^>]+rel="canonical"[^>]*>/) || [""])[0], "href");
  const want = p === "/" ? SITE : SITE + p;
  if (canonical !== want && !(p === "/" && canonical === SITE + "/")) problems.push(`canonical ${canonical}`);
  const ogUrl = meta(html, "og:url");
  if (ogUrl !== canonical && !(p === "/" && (ogUrl === SITE || ogUrl === SITE + "/"))) problems.push(`og:url ${ogUrl} ≠ canonical`);
  for (const k of ["og:title", "og:description", "og:image", "twitter:card", "twitter:title", "twitter:description"]) if (!meta(html, k)) problems.push(`no ${k}`);
  if (/localhost|127\.0\.0\.1|vercel\.app|\.local\b/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) problems.push("development host in HTML");

  // headings
  const hs = [...body.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (hs.filter((h) => h === 1).length !== 1) problems.push(`h1 count ${hs.filter((h) => h === 1).length}`);
  for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { problems.push(`heading skip h${hs[i - 1]}→h${hs[i]}`); break; }

  // structured data
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const isStory = p.startsWith("/stories/");
  if (isStory !== (lds.length === 1)) problems.push(`JSON-LD blocks: ${lds.length}`);
  for (const raw of lds) {
    let ld;
    try { ld = JSON.parse(raw); } catch { problems.push("JSON-LD not valid JSON"); continue; }
    const flat = JSON.stringify(ld);
    if (/undefined|null|NaN/.test(flat)) problems.push("JSON-LD has empty values");
    if (/date(Published|Modified|Created)/.test(flat)) problems.push("JSON-LD has a date");
    const s = stories.find((x) => `/stories/${x.category}/${x.slug}` === p);
    if (ld["@type"] !== "Article") problems.push(`JSON-LD type ${ld["@type"]}`);
    if (s && ld.headline !== (s.label ? `${s.title}: ${s.label}` : s.title)) problems.push("JSON-LD headline mismatch");
    if (s && (ld.author?.name ?? undefined) !== s.author) problems.push("JSON-LD author mismatch");
    if (ld.mainEntityOfPage !== want) problems.push("JSON-LD mainEntityOfPage mismatch");
    if (ld.publisher?.name !== "NKN Media FZ LLC") problems.push("JSON-LD publisher");
  }

  // links
  for (const m of body.matchAll(/<a\b[^>]*>/g)) {
    const href = attr(m[0], "href");
    if (!href) { problems.push("anchor without href"); continue; }
    if (href.startsWith("mailto:")) { if (!/^mailto:info@nknmedia\.in(\?|$)/.test(href)) problems.push(`unexpected mailto ${href}`); continue; }
    if (href.startsWith("tel:")) { if (!/^tel:\+\d{8,15}$/.test(href)) problems.push(`malformed tel ${href}`); continue; }
    if (/^https?:\/\//.test(href)) {
      if (!external.has(href)) external.set(href, p);
      if (attr(m[0], "target") === "_blank" && !/noopener/.test(attr(m[0], "rel") ?? "")) problems.push(`target=_blank without noopener: ${href}`);
      continue;
    }
    if (href.includes("#")) anchors.push([p, href]);
    const pathOnly = href.split("#")[0] || p;
    if (!internal.has(pathOnly)) internal.set(pathOnly, p);
  }

  // images
  for (const m of body.matchAll(/<img\b[^>]*>/g)) {
    const src = attr(m[0], "src");
    const alt = attr(m[0], "alt");
    if (alt === undefined) problems.push(`img without alt: ${src?.slice(0, 60)}`);
    if (src && !imgs.has(src)) imgs.set(src, p);
  }

  check("page", problems.length === 0, `${p} — "${title.slice(0, 60)}"${problems.length ? " | " + problems.join("; ") : ""}`);
}

const dupTitles = [...titles].filter(([, ps]) => ps.length > 1);
check("titles", dupTitles.length === 0, `${titles.size} unique titles for ${pages.length} pages${dupTitles.length ? " — duplicates: " + dupTitles.map(([t, ps]) => `"${t}" on ${ps.join(", ")}`).join("; ") : ""}`);

// internal links resolve (200), are canonical pages or assets, and never redirect
const internalFails = [];
for (const [href, from] of internal) {
  const res = await fetch(BASE + href, { redirect: "manual" });
  await res.arrayBuffer();
  if (res.status !== 200) internalFails.push(`${res.status} ${href} (on ${from})`);
  else if (!href.startsWith("/_next") && !/\.[a-z]{2,4}$/.test(href) && !expected.includes(href)) internalFails.push(`not in sitemap: ${href} (on ${from})`);
}
check("links", internalFails.length === 0, `${internal.size} unique internal link targets — ${internalFails.length ? internalFails.join("; ") : "all 200, none redirect, all in the sitemap"}`);

// #anchors point at an element that exists on the target page
const anchorFails = [];
for (const [from, href] of anchors) {
  const [pth, id] = href.split("#");
  const target = pth || from;
  const html = pageHtml.get(target) ?? (await (await fetch(BASE + target)).text());
  if (!new RegExp(`\\sid="${id}"`).test(html)) anchorFails.push(`${href} (on ${from})`);
}
check("links", anchorFails.length === 0, `${new Set(anchors.map((a) => a[1])).size} in-page anchors — ${anchorFails.length ? [...new Set(anchorFails)].join("; ") : "every target id exists"}`);

// images load
const imgFails = [];
for (const [src] of imgs) {
  const res = await fetch(new URL(src, BASE));
  const type = res.headers.get("content-type") ?? "";
  await res.arrayBuffer();
  if (!res.ok || !type.startsWith("image/")) imgFails.push(`${res.status} ${src.slice(0, 80)}`);
}
check("images", imgFails.length === 0, `${imgs.size} unique image URLs — ${imgFails.length ? imgFails.join("; ") : "all load as images"}`);

// Open Graph images resolve
const ogImgs = new Set([...pageHtml.values()].map((h) => meta(h, "og:image")).filter(Boolean));
// Images from /public are absolute on the canonical origin, which still serves
// the old WordPress site until cutover — so they are checked against this
// build. Remote images (covers hosted on the current site) are checked live.
const ogFails = [];
let ogLocal = 0;
for (const u of ogImgs) {
  // /wp-content/uploads/… files belong to the current WordPress site, not this build
  const local = u.startsWith(SITE + "/") && !u.startsWith(SITE + "/wp-content/");
  if (local) ogLocal++;
  const r = await fetch(local ? BASE + u.slice(SITE.length) : u);
  const type = r.headers.get("content-type") ?? "";
  await r.arrayBuffer();
  if (!r.ok || !type.startsWith("image/")) ogFails.push(`${r.status} ${u}`);
}
check("og", ogFails.length === 0, `${ogImgs.size} distinct og:image URLs (${ogLocal} served by this build at the canonical origin, ${ogImgs.size - ogLocal} remote) — ${ogFails.length ? ogFails.join("; ") : "all resolve"}`);

// external links (bot-blocking social sites answer 403/999: reported, not broken)
const extRows = [];
for (const [href, from] of external) {
  let status = "ERR";
  try {
    let r = await fetch(href, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20000) });
    if ([403, 405, 999].includes(r.status) || r.status >= 500) r = await fetch(href, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    status = r.status;
  } catch {}
  extRows.push({ href, from, status });
}
const extBroken = extRows.filter((r) => r.status === "ERR" || (r.status >= 400 && ![403, 429, 999].includes(r.status)));
const extBlocked = extRows.filter((r) => [403, 429, 999].includes(r.status));
check("external", extBroken.length === 0, `${extRows.length} external links — ${extRows.length - extBroken.length - extBlocked.length} OK${extBlocked.length ? `, ${extBlocked.length} bot-blocked (${extBlocked.map((r) => `${r.status} ${r.href}`).join(", ")})` : ""}${extBroken.length ? " | BROKEN: " + extBroken.map((r) => `${r.status} ${r.href}`).join(", ") : ""}`);

// ---------------------------------------------------------------------------
// 3. Unknown routes: 404, never a redirect
// ---------------------------------------------------------------------------
for (const [p, want] of [
  ["/does-not-exist", 404],
  ["/inflight-magazine/not-an-edition", 404],
  ["/inflight-magazine/september-2026/extra", 404],
  ["/stories", 404],
  ["/stories/travel", 404],
  ["/stories/travel-escapes/not-a-story", 404],
  ["/stories/food-flavours/kolkata-forever-day-in-a-city", 404],
  ["/api/does-not-exist", 404],
  ["/api/contact", 405],
  ["/wp-admin", 404],
]) {
  const r = await fetch(BASE + p, { redirect: "manual" });
  const html = await r.text();
  const branded = want !== 404 || /Page not found/.test(html);
  check("status", r.status === want && branded, `${p} → ${r.status}${want === 404 ? (branded ? " (branded 404, noindex)" : " (unbranded)") : ""}`);
}

// ---------------------------------------------------------------------------
// 4. Secrets: nothing server-side reaches the browser bundles or the source
// ---------------------------------------------------------------------------
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(f)));
    else out.push(f);
  }
  return out;
}
const clientFiles = (await walk("../.next/static")).filter((f) => /\.(js|css|json|html)$/.test(f));
const leaks = [];
for (const f of clientFiles) {
  const t = await fs.readFile(f, "utf8");
  for (const needle of ["SMTP_", "SMTP_PASSWORD", "createTransport", "nodemailer", "CONTACT_TO_EMAIL"]) if (t.includes(needle)) leaks.push(`${needle} in ${path.relative("..", f)}`);
}
check("security", leaks.length === 0, `${clientFiles.length} client bundle files scanned — ${leaks.length ? leaks.join("; ") : "no SMTP settings, mailer code or env names"}`);

const srcFiles = (await walk("../src")).concat(["../next.config.ts", "../package.json", "../.env.example"]);
const secretHits = [];
for (const f of srcFiles) {
  const t = await fs.readFile(f, "utf8");
  if (/(sk_live|sk_test|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-|ghp_[A-Za-z0-9]{20,})/.test(t)) secretHits.push(`token pattern in ${f}`);
  if (/(password|passwd|api[_-]?key|secret)\s*[:=]\s*["'][^"'\s]{4,}["']/i.test(t)) secretHits.push(`hard-coded credential in ${f}`);
}
const envFiles = (await fs.readdir("..")).filter((f) => /^\.env/.test(f) && f !== ".env.example");
check("security", secretHits.length === 0 && envFiles.length === 0, `${srcFiles.length} source/config files — ${secretHits.length ? secretHits.join("; ") : "no hard-coded credentials or tokens"}; env files present: ${envFiles.length ? envFiles.join(", ") : "none (only .env.example)"}`);
const envExample = await fs.readFile("../.env.example", "utf8");
check("security", !/^[A-Z_]+=\S+/m.test(envExample), ".env.example contains variable names only, no values");

// security headers
const h = (await fetch(BASE + "/")).headers;
check("security", h.get("x-content-type-options") === "nosniff" && h.get("x-frame-options") === "SAMEORIGIN" && !!h.get("referrer-policy") && !h.get("x-powered-by"),
  `headers: nosniff, SAMEORIGIN, ${h.get("referrer-policy")}; X-Powered-By ${h.get("x-powered-by") ? "present" : "removed"}`);

await fs.mkdir("screenshots", { recursive: true });
await fs.writeFile("screenshots/p5-audit.json", JSON.stringify({ results, external: extRows }, null, 1));
for (const r of results) if (!r.ok || r.area !== "page") console.log(`${r.ok ? "PASS" : "FAIL"} [${r.area}] ${r.detail}`);
const pageRows = results.filter((r) => r.area === "page");
console.log(`pages: ${pageRows.filter((r) => r.ok).length}/${pageRows.length} pass metadata/heading/link/image checks`);
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} FAILED CHECK(S)` : "\nP5 AUDIT: ALL PASS");
