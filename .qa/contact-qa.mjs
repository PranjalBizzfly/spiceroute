// Contact form QA: the real /api/contact route handler against a local SMTP
// sink (so delivery runs end to end without external credentials), plus the
// form in a real browser.
//
// Starts its own production server on :3126 with SMTP pointed at the sink.
// A server without SMTP settings (the real pre-configuration state) is
// expected on :3123 for the "not configured" checks.
// Usage: node contact-qa.mjs
import fs from "node:fs/promises";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const SINK_PORT = 2525;
const QA_PORT = 3126;
const QA = `http://localhost:${QA_PORT}`;
const UNCONFIGURED = "http://localhost:3123";
const OUT = "screenshots/contact";
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// Minimal SMTP sink. mode: "accept" | "reject" (550 on MAIL FROM)
// ---------------------------------------------------------------------------
const sink = { mode: "accept", messages: [], auths: 0 };
const smtp = net.createServer((socket) => {
  let data = null;
  let authStep = null;
  const send = (line) => socket.write(line + "\r\n");
  send("220 qa-sink ESMTP");
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let i;
    while ((i = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 2);
      if (data !== null) {
        if (line === ".") {
          sink.messages.push(data.join("\r\n"));
          data = null;
          send("250 2.0.0 queued");
        } else data.push(line.startsWith("..") ? line.slice(1) : line);
        continue;
      }
      if (authStep === "user") { authStep = "pass"; send("334 UGFzc3dvcmQ6"); continue; }
      if (authStep === "pass") { authStep = null; sink.auths++; send("235 2.7.0 ok"); continue; }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO") { send("250-qa-sink"); send("250-AUTH PLAIN LOGIN"); send("250 8BITMIME"); }
      else if (cmd === "HELO") send("250 qa-sink");
      else if (cmd === "AUTH") {
        if (/^AUTH PLAIN \S+/i.test(line)) { sink.auths++; send("235 2.7.0 ok"); }
        else if (/^AUTH PLAIN$/i.test(line)) { authStep = "pass"; send("334 "); }
        else { authStep = "user"; send("334 VXNlcm5hbWU6"); }
      } else if (cmd === "MAIL") send(sink.mode === "reject" ? "550 5.7.1 rejected by qa sink" : "250 ok");
      else if (cmd === "RCPT") send("250 ok");
      else if (cmd === "DATA") { data = []; send("354 go ahead"); }
      else if (cmd === "QUIT") { send("221 bye"); socket.end(); }
      else send("250 ok");
    }
  });
  socket.on("error", () => {});
});
await new Promise((r) => smtp.listen(SINK_PORT, "127.0.0.1", r));

// ---------------------------------------------------------------------------
// Production server with SMTP → sink
// ---------------------------------------------------------------------------
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(QA_PORT)], {
  cwd: "..",
  env: {
    ...process.env,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(SINK_PORT),
    SMTP_USER: "qa@example.com",
    SMTP_PASSWORD: "qa-only",
    SMTP_REQUIRE_TLS: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(QA + "/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const results = [];
const check = (area, ok, detail) => { results.push({ area, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} [${area}] ${detail}`); };

const valid = (over = {}) => ({
  firstName: "Asha",
  lastName: "Rao",
  email: "asha.rao@example.com",
  phone: "+91 98404 00000",
  company: "QA Test Brand",
  topic: "Marketing",
  message: "We would like to know about advertising in SpiceRoute.",
  hp: "",
  elapsedMs: 4000,
  ...over,
});
// Message bodies arrive transfer-encoded (quoted-printable for UTF-8 text)
function decodeBody(raw) {
  const split = raw.indexOf("\r\n\r\n");
  const head = raw.slice(0, split);
  let text = raw.slice(split + 4);
  if (/content-transfer-encoding:\s*base64/i.test(head)) return Buffer.from(text.replace(/\s+/g, ""), "base64").toString("utf8");
  if (!/content-transfer-encoding:\s*quoted-printable/i.test(head)) return text;
  text = text.replace(/=\r\n/g, "");
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const hex = text.slice(i + 1, i + 3);
    if (text[i] === "=" && /^[0-9A-F]{2}$/i.test(hex)) { bytes.push(parseInt(hex, 16)); i += 2; }
    else bytes.push(...Buffer.from(text[i]));
  }
  return Buffer.from(bytes).toString("utf8");
}

let ipSeq = 1;
const post = async (body, { base = QA, headers = {}, raw } = {}) => {
  const res = await fetch(base + "/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.20.0.${ipSeq++}`, ...headers },
    body: raw ?? JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers };
};

// ---------------------------------------------------------------------------
// 1. Endpoint behaviour
// ---------------------------------------------------------------------------
{
  const get = await fetch(QA + "/api/contact");
  check("api", get.status === 405, `GET → ${get.status}`);

  let r = await post(null, { headers: { "Content-Type": "text/plain" }, raw: "hello" });
  check("api", r.status === 415, `non-JSON content type → ${r.status} ${r.json?.code}`);
  r = await post(null, { raw: "{not json" });
  check("api", r.status === 400 && r.json?.code === "invalid_payload", `malformed JSON → ${r.status} ${r.json?.code}`);
  r = await post(null, { raw: "[1,2]" });
  check("api", r.status === 400 && r.json?.code === "invalid_payload", `array payload → ${r.status}`);
  r = await post({ ...valid(), isAdmin: true });
  check("api", r.status === 400 && r.json?.code === "invalid_payload", `unexpected key → ${r.status}`);
  r = await post({ ...valid(), email: ["a@b.co"] });
  check("api", r.status === 400 && r.json?.code === "invalid_payload", `non-string field → ${r.status}`);
  r = await post(null, { raw: JSON.stringify({ ...valid(), message: "x".repeat(20000) }) });
  check("api", r.status === 413, `oversized body (20 KB) → ${r.status} ${r.json?.code}`);
  r = await post(valid(), { headers: { Origin: "https://attacker.example" } });
  check("api", r.status === 403, `cross-site Origin → ${r.status}`);

  // spam signals
  r = await post(valid({ hp: "http://spam.example" }));
  check("spam", r.status === 400 && r.json?.code === "rejected" && !r.json?.ok, `honeypot filled → ${r.status} ${r.json?.code}`);
  r = await post(valid({ elapsedMs: 200 }));
  check("spam", r.status === 400 && r.json?.code === "too_fast", `submitted 0.2 s after load → ${r.status} ${r.json?.code}`);

  // validation
  const cases = [
    ["empty submission", { firstName: "", lastName: "", email: "", message: "", topic: "" }, ["firstName", "lastName", "email", "topic", "message"]],
    ["whitespace-only values", { firstName: "   ", lastName: "\t", message: "      " }, ["firstName", "lastName", "message"]],
    ["invalid email", { email: "asha.example.com" }, ["email"]],
    ["invalid email (spaces)", { email: "asha rao@example.com" }, ["email"]],
    ["missing required field", { message: undefined }, ["message"]],
    ["unknown topic", { topic: "Editorial" }, ["topic"]],
    ["header injection in name", { firstName: "Asha\r\nBcc: victim@example.com" }, ["firstName"]],
    ["name too long", { lastName: "R".repeat(61) }, ["lastName"]],
    ["message too short", { message: "hi there" }, ["message"]],
    ["message too long", { message: "m".repeat(5001) }, ["message"]],
    ["invalid phone", { phone: "call me maybe" }, ["phone"]],
  ];
  for (const [name, over, fields] of cases) {
    const body = valid(over);
    for (const k of Object.keys(over)) if (over[k] === undefined) delete body[k];
    r = await post(body);
    const got = Object.keys(r.json?.errors ?? {}).sort();
    const ok = r.status === 400 && r.json?.code === "invalid" && JSON.stringify(got) === JSON.stringify([...fields].sort());
    check("validation", ok, `${name} → ${r.status} errors [${got.join(", ")}]`);
  }
  // nothing submitted is echoed back
  r = await post(valid({ email: "not-an-email-SECRET123" }));
  check("privacy", !r.text.includes("SECRET123"), "submitted values are not echoed in responses");
  check("api", r.headers.get("cache-control") === "no-store", `responses are not cacheable (${r.headers.get("cache-control")})`);

  // not configured (server without SMTP settings)
  try {
    r = await post(valid(), { base: UNCONFIGURED });
    check("delivery", r.status === 503 && r.json?.code === "not_configured" && r.json?.ok === false, `no SMTP settings → ${r.status} ${r.json?.code} (never "ok")`);
  } catch {
    check("delivery", false, "server without SMTP settings not reachable on :3123");
  }

  // successful delivery
  sink.mode = "accept";
  sink.messages.length = 0;
  r = await post(valid());
  const mail = sink.messages[0] ?? "";
  const body = decodeBody(mail);
  check("delivery", r.status === 200 && r.json?.ok === true && sink.messages.length === 1, `valid submission → ${r.status}, SMTP sink received ${sink.messages.length}`);
  check("delivery", sink.auths > 0, "authenticated with SMTP_USER / SMTP_PASSWORD");
  check("delivery", /^To: info@nknmedia\.in/im.test(mail), "delivered to the verified address info@nknmedia.in (default)");
  check("delivery", /^From: .*qa@example\.com/im.test(mail), "sent from SMTP_USER (default sender)");
  check("delivery", /^Reply-To: .*asha\.rao@example\.com/im.test(mail), "Reply-To is the visitor's address");
  check("delivery", /^Subject: Website enquiry \(Marketing\) from Asha Rao/im.test(mail), "subject carries topic and name");
  check("delivery", ["Topic:      Marketing", "Asha", "Rao", "asha.rao@example.com", "QA Test Brand", "+91 98404 00000", "We would like to know about advertising in SpiceRoute."].every((s) => body.includes(s)), "body (decoded) carries every field");
  check("delivery", !/^Bcc:/im.test(mail), "no Bcc header");

  // duplicate: the same message is not sent twice
  r = await post(valid());
  check("duplicate", r.status === 200 && r.json?.duplicate === true && sink.messages.length === 1, `identical resubmission → ${r.status} duplicate=${r.json?.duplicate}, sink still ${sink.messages.length}`);

  // server failure
  sink.mode = "reject";
  r = await post(valid({ message: "A different message to force a new delivery attempt." }));
  check("failure", r.status === 500 && r.json?.code === "delivery_failed" && r.json?.ok === false, `SMTP rejects → ${r.status} ${r.json?.code}`);
  check("privacy", !/asha|QA Test Brand|98404/i.test(serverLog), "server log contains no submitted details");
  sink.mode = "accept";

  // rate limit (same IP)
  const ip = { "X-Forwarded-For": "10.30.0.1" };
  const codes = [];
  for (let i = 0; i < 10; i++) codes.push((await post(valid({ email: "", message: "" }), { headers: ip })).status);
  const limited = await post(valid(), { headers: ip });
  check("rate-limit", codes.slice(0, 8).every((c) => c === 400) && codes.slice(8).every((c) => c === 429) && limited.status === 429 && Number(limited.headers.get("retry-after")) > 0,
    `10 attempts from one IP → ${codes.join(",")}; then ${limited.status} Retry-After ${limited.headers.get("retry-after")}s`);
}

// ---------------------------------------------------------------------------
// 2. The form in a browser
// ---------------------------------------------------------------------------
const browser = await chromium.launch();
let ctxN = 0;
async function formPage(base, width = 1280, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height }, extraHTTPHeaders: { "X-Forwarded-For": `10.40.0.${++ctxN}` } });
  const page = await ctx.newPage();
  const posts = [];
  const consoleErrors = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/contact") && r.method() === "POST") posts.push(r); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource.*(503|500|400)/.test(m.text())) consoleErrors.push(m.text()); });
  await page.goto(base + "/contact", { waitUntil: "networkidle" });
  await page.waitForTimeout(1700); // a person takes a moment; the form refuses instant submits
  return { ctx, page, posts, consoleErrors };
}
async function fill(page, v = valid()) {
  await page.fill("#cf-firstName", v.firstName);
  await page.fill("#cf-lastName", v.lastName);
  await page.fill("#cf-email", v.email);
  await page.fill("#cf-phone", v.phone);
  await page.fill("#cf-company", v.company);
  await page.fill("#cf-message", v.message);
  await page.locator(`input[name="topic"][value="${v.topic}"]`).check();
}
const successShown = (page) => page.locator("text=Message sent").count();

// Labels and structure
{
  const { ctx, page } = await formPage(QA);
  const a11y = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll(".ed-form input, .ed-form textarea")].filter((i) => !i.closest(".ed-form__hp"));
    const unlabeled = inputs.filter((i) => i.type !== "radio" && !document.querySelector(`label[for="${i.id}"]`)).map((i) => i.name);
    const radiosLabelled = [...document.querySelectorAll('input[name="topic"]')].every((r) => r.closest("label")?.textContent.trim());
    const legend = document.querySelector(".ed-form__topics legend")?.textContent.trim();
    const hp = document.querySelector(".ed-form__hp");
    return { count: inputs.length, unlabeled, radiosLabelled, legend, hpHidden: hp?.getAttribute("aria-hidden") === "true" && hp.querySelector("input").tabIndex === -1 };
  });
  check("a11y", a11y.unlabeled.length === 0 && a11y.radiosLabelled && a11y.legend === "Topic" && a11y.hpHidden, `every field labelled (${a11y.count} inputs), topic radios in a fieldset "${a11y.legend}", honeypot hidden from people and AT`);
  await ctx.close();
}

// A. empty submission (client validation; nothing sent)
{
  const { ctx, page, posts } = await formPage(QA);
  await page.click("main button[type=submit]");
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({
    alert: document.querySelector(".ed-form__alert[role=alert]")?.textContent.trim(),
    invalid: [...document.querySelectorAll("[aria-invalid=true]")].map((e) => e.name),
    described: [...document.querySelectorAll("[aria-invalid=true]")].every((e) => document.getElementById(e.getAttribute("aria-describedby"))?.textContent.trim()),
    focused: document.activeElement?.name,
  }));
  check("form-A", posts.length === 0 && st.invalid.join() === "firstName,lastName,email,message" && st.described && st.focused === "firstName" && (await successShown(page)) === 0,
    `empty → no request, "${st.alert}", invalid [${st.invalid}], errors linked by aria-describedby, focus → ${st.focused}`);
  await page.screenshot({ path: `${OUT}/A-empty.png`, fullPage: false });
  await ctx.close();
}

// B. invalid email / C. missing required field — values preserved
{
  const { ctx, page, posts } = await formPage(QA);
  await fill(page, valid({ email: "asha.example.com" }));
  await page.click("main button[type=submit]");
  await page.waitForTimeout(300);
  let st = await page.evaluate(() => ({ invalid: [...document.querySelectorAll("[aria-invalid=true]")].map((e) => e.name), msg: document.getElementById("cf-email-error")?.textContent, first: document.getElementById("cf-firstName").value, focused: document.activeElement?.name }));
  check("form-B", posts.length === 0 && st.invalid.join() === "email" && st.first === "Asha" && st.focused === "email", `invalid email → "${st.msg}", other values kept, focus → ${st.focused}`);
  await page.fill("#cf-email", "asha.rao@example.com");
  await page.fill("#cf-message", "");
  await page.click("main button[type=submit]");
  await page.waitForTimeout(300);
  st = await page.evaluate(() => ({ invalid: [...document.querySelectorAll("[aria-invalid=true]")].map((e) => e.name), msg: document.getElementById("cf-message-error")?.textContent }));
  check("form-C", posts.length === 0 && st.invalid.join() === "message", `missing message → "${st.msg}"`);
  await ctx.close();
}

// D. valid submission — success only after the server confirms
{
  sink.messages.length = 0;
  const { ctx, page, posts, consoleErrors } = await formPage(QA);
  await fill(page, valid({ message: "Browser test D: please send the media kit details." }));
  await page.click("main button[type=submit]");
  await page.locator("text=Message sent").waitFor({ timeout: 15000 });
  const focusedDone = await page.evaluate(() => document.activeElement?.classList.contains("ed-form--done"));
  check("form-D", posts.length === 1 && sink.messages.length === 1 && focusedDone && consoleErrors.length === 0, `valid → 1 request, sink received ${sink.messages.length}, "Message sent" shown and focused`);
  await page.screenshot({ path: `${OUT}/D-sent.png` });
  await ctx.close();
}

// E. double-click / repeated submit — one request, one email
{
  sink.messages.length = 0;
  const { ctx, page, posts } = await formPage(QA);
  await fill(page, valid({ message: "Browser test E: double click must send once." }));
  await page.dblclick("main button[type=submit]");
  await page.keyboard.press("Enter").catch(() => {});
  await page.locator("text=Message sent").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  check("form-E", posts.length === 1 && sink.messages.length === 1, `double-click + Enter → ${posts.length} request(s), ${sink.messages.length} email(s)`);
  await ctx.close();
}

// F. server failure — error, retry possible, values kept, verified mailto fallback
{
  sink.mode = "reject";
  const { ctx, page } = await formPage(QA);
  await fill(page, valid({ message: "Browser test F: the mail server will refuse this." }));
  await page.click("main button[type=submit]");
  await page.locator(".ed-form__alert[role=alert]").waitFor({ timeout: 15000 });
  const st = await page.evaluate(() => ({
    text: document.querySelector(".ed-form__alert")?.textContent.trim(),
    mailto: document.querySelector(".ed-form__alert a")?.getAttribute("href") ?? "",
    kept: document.getElementById("cf-message").value,
    enabled: !document.querySelector("main button[type=submit]").disabled,
  }));
  check("form-F", (await successShown(page)) === 0 && /could not be sent/.test(st.text) && st.mailto.startsWith("mailto:info@nknmedia.in?") && st.kept.includes("Browser test F") && st.enabled,
    `SMTP failure → error "${st.text.slice(0, 70)}…", no success, values kept, retry enabled, mailto → info@nknmedia.in`);
  await page.screenshot({ path: `${OUT}/F-failed.png` });
  // retry succeeds once the server recovers
  sink.mode = "accept";
  await page.click("main button[type=submit]");
  await page.locator("text=Message sent").waitFor({ timeout: 15000 });
  check("form-F", true, "retry after the failure → sent");
  await ctx.close();
}

// F2. not configured (the state before SMTP credentials exist)
try {
  const { ctx, page } = await formPage(UNCONFIGURED);
  await fill(page, valid({ message: "Browser test F2: no SMTP settings on this server." }));
  await page.click("main button[type=submit]");
  await page.locator(".ed-form__alert[role=alert]").waitFor({ timeout: 15000 });
  const st = await page.evaluate(() => ({ text: document.querySelector(".ed-form__alert")?.textContent.trim(), mailto: decodeURIComponent(document.querySelector(".ed-form__alert a")?.getAttribute("href") ?? "") }));
  check("form-F2", (await successShown(page)) === 0 && /not been sent/.test(st.text) && st.mailto.includes("Browser test F2") && st.mailto.startsWith("mailto:info@nknmedia.in"),
    `no SMTP → "${st.text.slice(0, 80)}…" + pre-filled email to info@nknmedia.in`);
  await page.screenshot({ path: `${OUT}/F2-not-configured.png` });
  await ctx.close();
} catch (e) {
  check("form-F2", false, `not-configured browser test failed: ${e.message.slice(0, 120)}`);
}

// F3. network failure and a 200 that is not a confirmed success
for (const [name, handler] of [
  ["network failure", (route) => route.abort("failed")],
  ["HTTP 200 without ok:true", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":false}' })],
  ["HTML error page", (route) => route.fulfill({ status: 502, contentType: "text/html", body: "<h1>Bad gateway</h1>" })],
]) {
  const { ctx, page } = await formPage(QA);
  await page.route("**/api/contact", handler);
  await fill(page, valid({ message: `Browser test F3: ${name}.` }));
  await page.click("main button[type=submit]");
  await page.locator(".ed-form__alert[role=alert]").waitFor({ timeout: 15000 });
  check("form-F3", (await successShown(page)) === 0, `${name} → error shown, never "Message sent"`);
  await ctx.close();
}

// Too-fast submit is explained, not reported as sent
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { "X-Forwarded-For": "10.40.9.9" } });
  const page = await ctx.newPage();
  await page.goto(QA + "/contact", { waitUntil: "networkidle" });
  await page.evaluate(() => {}); // submit immediately
  await fill(page, valid({ message: "Browser test: submitted instantly by a script." }));
  await page.click("main button[type=submit]");
  await page.locator(".ed-form__alert[role=alert]").waitFor({ timeout: 15000 });
  const text = await page.locator(".ed-form__alert").innerText();
  check("spam", (await successShown(page)) === 0 && /take a moment/.test(text), `instant submit → "${text.slice(0, 60)}…"`);
  await ctx.close();
}

// G. mobile submission (touch)
for (const w of [320, 390]) {
  sink.messages.length = 0;
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, extraHTTPHeaders: { "X-Forwarded-For": `10.50.0.${w}` } });
  const page = await ctx.newPage();
  await page.goto(QA + "/contact", { waitUntil: "networkidle" });
  await page.waitForTimeout(1700);
  await fill(page, valid({ message: `Browser test G: sent from a ${w}px phone.` }));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const tap = await page.evaluate(() => [...document.querySelectorAll(".ed-form__pill, .ed-form__input, .ed-form button")].map((e) => e.getBoundingClientRect()).filter((r) => r.height < 40).length);
  await page.locator("main button[type=submit]").tap();
  await page.locator("text=Message sent").waitFor({ timeout: 15000 });
  check("form-G", sink.messages.length === 1 && !overflow && tap === 0, `${w}px touch → sent (${sink.messages.length}), no overflow, all targets ≥40px`);
  await page.screenshot({ path: `${OUT}/G-mobile-${w}.png`, fullPage: true });
  await ctx.close();
}

// H. keyboard only: tab through, type, choose topic with arrows, Enter to send
{
  sink.messages.length = 0;
  const { ctx, page } = await formPage(QA);
  await page.focus('input[name="topic"]:checked');
  await page.keyboard.press("ArrowRight"); // Sales → Marketing
  await page.keyboard.press("Tab");
  await page.keyboard.type("Asha");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Rao");
  await page.keyboard.press("Tab");
  await page.keyboard.type("asha.rao@example.com");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Browser test H: typed with the keyboard only.");
  const order = await page.evaluate(() => document.activeElement?.name);
  const focusVisible = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== "none");
  await page.keyboard.press("Tab"); // → Send message
  const onButton = await page.evaluate(() => document.activeElement?.type === "submit");
  await page.keyboard.press("Enter");
  await page.locator("text=Message sent").waitFor({ timeout: 15000 });
  const mail = sink.messages[0] ?? "";
  check("form-H", order === "message" && onButton && focusVisible && /Subject: Website enquiry \(Marketing\)/.test(mail),
    `keyboard: topic by arrow keys → Marketing, fields in order, visible focus, Enter on "Send message" → sent`);
  await ctx.close();
}

// Reduced motion: the form works and the spinner does not spin
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", extraHTTPHeaders: { "X-Forwarded-For": "10.60.0.1" } });
  const page = await ctx.newPage();
  await page.route("**/api/contact", async (route) => { await new Promise((r) => setTimeout(r, 800)); await route.continue(); });
  await page.goto(QA + "/contact", { waitUntil: "networkidle" });
  await page.waitForTimeout(1700);
  await fill(page, valid({ message: "Browser test: reduced motion preference." }));
  await page.click("main button[type=submit]");
  const spinner = await page.locator(".ed-form__spinner").evaluate((e) => getComputedStyle(e).animationName).catch(() => "absent");
  const disabled = await page.locator("main button[type=submit]").isDisabled().catch(() => false);
  await page.locator("text=Message sent").waitFor({ timeout: 15000 });
  check("form-motion", spinner === "none" && disabled, `while sending: button disabled, spinner animation "${spinner}" under reduced motion`);
  await ctx.close();
}

await browser.close();
server.kill();
smtp.close();

await fs.writeFile(`${OUT}/contact-qa.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} contact checks pass`);
console.log(failed.length ? `${failed.length} FAILED` : "CONTACT QA: ALL PASS");
process.exit(0);
