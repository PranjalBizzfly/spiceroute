# Spice Route — The Inflight Magazine of SpiceJet

Website for Spice Route, published by NKN Media. Next.js 16 (App Router), React 19, TypeScript.

- 29 editions (`src/data/editions.ts`) and 20 web articles (`src/data/stories.ts`). Article text is source-exact from the edition PDFs; `stories.ts` is generated, so don't edit it by hand.
- Every page is statically generated. The only server code is the contact form endpoint, `POST /api/contact`.

## Scripts

```bash
npm install
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint
npx tsc --noEmit
```

Requires Node.js 20.9 or newer.

## Colour themes

- **Single source of colour:** every colour is defined once, in the token block at the top of `src/app/globals.css`. Components use only the semantic tokens (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--highlight-*`, `--header-*`, `--footer-*`), never raw colours.
- **Brand palette:** taken from the original spiceroutemagazine.in: SpiceJet red `#EC1C24`, orange `#F6981D`, yellow `#FCD406`, charcoal `#1E2228` and grey `#636468`. Slightly deeper shades of red and orange carry small text and button labels at WCAG AA.
- **Light theme (default):** white pages, with the header and footer as SpiceJet-red bands as on the original site.
- **Dark theme:** deep charcoal surfaces with the same accents.
- **Choosing a theme:** until the visitor chooses, the site follows their device setting (`prefers-color-scheme`). The theme switch (`src/components/ThemeToggle.tsx`) is an icon button in the desktop header and a "Dark theme" switch in the mobile menu. A choice is saved in `localStorage` (`sr-theme`), applied to open tabs, and re-applied before first paint by the inline script in the root layout (`src/lib/theme.ts`), so there is no flash of the other theme.
- **Forcing a theme in code:** set `data-theme="light"` or `data-theme="dark"` on `<html>`. Add the class `ed-scope-dark` to keep a subtree dark in either theme; the PDF reader uses it.

## Contact form

The form on `/contact` posts to `POST /api/contact`. The route:

- validates every field on the server
- applies the spam checks (honeypot, minimum fill time, rate limit, duplicate suppression)
- sends the message by SMTP through `nodemailer`

It reports success only after the SMTP server has accepted the message.

Set these environment variables on the host (or in `.env.local`; see `.env.example`). None of them are exposed to the browser.

| Variable | Required | Meaning |
| --- | --- | --- |
| `SMTP_HOST` | yes | Outgoing mail server of the mailbox that sends the form |
| `SMTP_PORT` | yes | Usually `465` (implicit TLS) or `587` (STARTTLS) |
| `SMTP_USER` | yes | SMTP login |
| `SMTP_PASSWORD` | yes | SMTP password or app password |
| `SMTP_SECURE` | no | `true` for implicit TLS; defaults to `true` on port 465 |
| `SMTP_REQUIRE_TLS` | no | STARTTLS is required on other ports; set `false` only for a trusted relay without TLS |
| `CONTACT_FROM_EMAIL` | no | Sender address (must be allowed by the SMTP account); defaults to `SMTP_USER` |
| `CONTACT_TO_EMAIL` | no | Recipient; defaults to `info@nknmedia.in`, the address published on the site and in the magazine imprint |

**Until the four required variables are set, the form sends nothing.** It tells the visitor that online sending is unavailable and offers a pre-filled email to `info@nknmedia.in`.

Responses from `/api/contact`:

| Status | Meaning |
| --- | --- |
| 200 | Delivered |
| 400 | Invalid input (per-field errors) or a spam signal |
| 403 | Cross-site request |
| 409 | The same message is already being sent |
| 413 | Request body too large |
| 415 | Not JSON |
| 429 | Rate limited (includes `Retry-After`) |
| 500 | Delivery failed |
| 503 | SMTP not configured |

Submitted details are never logged, stored or echoed back.

### Limitations

- **Per-instance limits:** the rate limit (8 attempts per IP per 10 minutes, 60 deliveries per hour) and duplicate suppression are held in memory. On a platform that runs several instances, each instance counts separately.
- **Client IP:** the IP comes from `X-Forwarded-For` / `X-Real-IP`, so the app should run behind the host's proxy.

## Deployment notes

- **Canonical origin:** `https://spiceroutemagazine.in`, set in `src/lib/site.ts`. Canonical URLs, Open Graph, structured data, `sitemap.xml` and `robots.txt` all use it. If the site goes live on a different domain, change it there.
- **Files on the current WordPress site:**
  - All 29 edition PDFs are served from `https://spiceroutemagazine.in/wp-content/uploads/…`, the current WordPress site.
  - If this app replaces WordPress on the same domain, those URLs must keep working. Either keep serving `/wp-content/uploads/`, or move the files into `public/` and update `src/data/editions.ts`.
  - The media kit is hosted on `nknmedia.ae`.
- **Images:** every image in `public/images/` is WebP, including all edition covers, which are served locally. `spice-route-logo.png` is kept only as the favicon. New story images come out of `.qa/write-stories.mjs` as WebP; `.qa/convert-webp.mjs` converts any other JPEG/PNG added later.
- **Security headers:** `next.config.ts` sets `nosniff`, `SAMEORIGIN` framing, a referrer policy and a permissions policy, and removes `X-Powered-By`.

## QA toolbox

`.qa/` holds the local verification scripts:

- content audit against the PDFs (`content-audit.mjs`: nothing on the web is invented)
- completeness audit (`completeness-audit.mjs`: nothing printed is lost). Every text block on each article's PDF pages must appear on the rendered article page, or be explained: a folio, running head, advert or another story's text. Deliberate exclusions are listed with reasons in `completeness-registry.mjs`.
- route, link and metadata audits
- Playwright browser QA
- contact-form QA against a local SMTP sink

Its heavy artefacts are git-ignored. Run the scripts from `.qa/` against a production build (`npm run build && npm run start`).
