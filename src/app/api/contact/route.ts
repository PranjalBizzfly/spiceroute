import { createHash } from "node:crypto";
import {
  CONTACT_MAX_BODY_BYTES,
  CONTACT_MIN_FILL_MS,
  CONTACT_PAYLOAD_KEYS,
  validateContact,
} from "@/lib/contactForm";
import { isMailConfigured, sendContactEmail } from "@/lib/mailer";

/*
 * POST /api/contact — the contact form's only endpoint.
 *
 * Responses (JSON, never cached):
 *   200 { ok: true }                          delivered (the SMTP server accepted it)
 *   400 { ok: false, code: "invalid", errors } a field failed validation
 *   400 { ok: false, code: "invalid_payload" | "rejected" | "too_fast" }
 *   403 { ok: false, code: "forbidden" }       cross-site request
 *   409 { ok: false, code: "in_progress" }     the same message is being sent right now
 *   413 { ok: false, code: "too_large" }
 *   415 { ok: false, code: "unsupported_media_type" }
 *   429 { ok: false, code: "rate_limited" }    with Retry-After
 *   500 { ok: false, code: "delivery_failed" | "server_error" }
 *   503 { ok: false, code: "not_configured" }  SMTP settings are missing
 *
 * A plain form post (application/x-www-form-urlencoded: the form sent before
 * its script loaded, or with scripts off) runs the same checks and answers
 * 303 → /contact?form=sent|invalid|not_configured|rate_limited|error.
 *
 * Other methods get 405 from Next.js. Submitted details are never logged,
 * stored or echoed back.
 */

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const reply = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...NO_STORE, ...headers } });

// ---- Abuse limits (in memory, per server instance) -------------------------
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP_LIMIT = 8; // attempts per IP per 10 minutes
const GLOBAL_HOURLY_LIMIT = 60; // deliveries per instance per hour
const DUPLICATE_MS = 30 * 60 * 1000;

const attemptsByIp = new Map<string, number[]>();
const deliveries: number[] = [];
const delivered = new Map<string, number>(); // message fingerprint → time sent
const inFlight = new Set<string>();

function prune(now: number) {
  for (const [ip, times] of attemptsByIp) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length) attemptsByIp.set(ip, recent);
    else attemptsByIp.delete(ip);
  }
  for (const [key, t] of delivered) if (now - t > DUPLICATE_MS) delivered.delete(key);
  while (deliveries.length && now - deliveries[0] > 60 * 60 * 1000) deliveries.shift();
}

function clientIp(request: Request): string {
  // Set by the hosting platform's proxy
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Browsers send Origin on POST; it must be this site. */
function isSameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients; still rate-limited
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads the body, refusing anything larger than the limit. */
async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > CONTACT_MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > CONTACT_MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * A plain HTML form post (the form submitted before its script loaded, or
 * with scripts off). The same checks run; the visitor is sent back to the
 * contact page with the outcome in the address (never their details), which
 * the form reads and reports.
 */
async function handleFormPost(request: Request): Promise<Response> {
  const back = (outcome: string) =>
    new Response(null, { status: 303, headers: { ...NO_STORE, Location: `/contact?form=${outcome}#contact-form` } });
  const raw = await readBody(request);
  if (raw === null) return back("error");
  const fields = Object.fromEntries(new URLSearchParams(raw));
  // Without a script there is no fill timer: the honeypot and rate limit apply
  const res = await handleJson(request, JSON.stringify({ ...fields, elapsedMs: CONTACT_MIN_FILL_MS }));
  const body = (await res.json()) as { ok?: boolean; code?: string };
  if (body.ok) return back("sent");
  return back(body.code === "invalid" ? "invalid" : body.code === "not_configured" ? "not_configured" : body.code === "rate_limited" ? "rate_limited" : "error");
}

export async function POST(request: Request) {
  try {
    const type = (request.headers.get("content-type") ?? "").toLowerCase();
    if (type.includes("application/x-www-form-urlencoded")) {
      if (!isSameOrigin(request)) return reply(403, { ok: false, code: "forbidden" });
      return await handleFormPost(request);
    }
    if (!type.includes("application/json")) return reply(415, { ok: false, code: "unsupported_media_type" });
    if (!isSameOrigin(request)) return reply(403, { ok: false, code: "forbidden" });

    const raw = await readBody(request);
    if (raw === null) return reply(413, { ok: false, code: "too_large" });
    return await handleJson(request, raw);
  } catch {
    console.error("[contact] unexpected error");
    return reply(500, { ok: false, code: "server_error" });
  }
}

async function handleJson(request: Request, raw: string): Promise<Response> {
  try {
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return reply(400, { ok: false, code: "invalid_payload" });
    }
    // A flat object with known keys and string values only
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return reply(400, { ok: false, code: "invalid_payload" });
    const body = payload as Record<string, unknown>;
    const allowed = new Set<string>(CONTACT_PAYLOAD_KEYS);
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.has(key)) return reply(400, { ok: false, code: "invalid_payload" });
      if (key === "elapsedMs" ? typeof value !== "number" : typeof value !== "string")
        return reply(400, { ok: false, code: "invalid_payload" });
    }

    // Rate limit every well-formed attempt
    const now = Date.now();
    prune(now);
    const ip = clientIp(request);
    const attempts = attemptsByIp.get(ip) ?? [];
    if (attempts.length >= PER_IP_LIMIT) {
      const retry = Math.ceil((WINDOW_MS - (now - attempts[0])) / 1000);
      return reply(429, { ok: false, code: "rate_limited" }, { "Retry-After": String(Math.max(retry, 1)) });
    }
    attemptsByIp.set(ip, [...attempts, now]);

    // Spam signals: the hidden field must stay empty, and a person takes a moment
    if (typeof body.hp === "string" && body.hp.length > 0) return reply(400, { ok: false, code: "rejected" });
    if (typeof body.elapsedMs !== "number" || !Number.isFinite(body.elapsedMs) || body.elapsedMs < CONTACT_MIN_FILL_MS)
      return reply(400, { ok: false, code: "too_fast" });

    const result = validateContact(body);
    if (!result.ok) return reply(400, { ok: false, code: "invalid", errors: result.errors });

    if (!isMailConfigured()) return reply(503, { ok: false, code: "not_configured" });

    // The same message from the same address is sent once
    const key = createHash("sha256")
      .update(`${result.data.email.toLowerCase()}\n${result.data.message}`)
      .digest("hex");
    if (delivered.has(key)) return reply(200, { ok: true, duplicate: true });
    if (inFlight.has(key)) return reply(409, { ok: false, code: "in_progress" });
    if (deliveries.length >= GLOBAL_HOURLY_LIMIT)
      return reply(429, { ok: false, code: "rate_limited" }, { "Retry-After": "600" });

    inFlight.add(key);
    try {
      await sendContactEmail(result.data);
    } catch (error) {
      // Only the failure class is logged — never the submitted details
      const code = (error as { code?: string; responseCode?: number }).code ?? "unknown";
      console.error(`[contact] delivery failed (${code})`);
      return reply(500, { ok: false, code: "delivery_failed" });
    } finally {
      inFlight.delete(key);
    }

    delivered.set(key, Date.now());
    deliveries.push(Date.now());
    return reply(200, { ok: true });
  } catch {
    console.error("[contact] unexpected error");
    return reply(500, { ok: false, code: "server_error" });
  }
}
