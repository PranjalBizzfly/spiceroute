# Spice Route — Final refinement pass: audit report (22 Sep 2026)

Three sessions worked on this pass in parallel:

- **This session (f1):** search, navigation, footer, contact verification, SEO checks and the site-wide responsive QA.
- **Session b2:** homepage structure, article pages, edition pages and `editorial.css`.
- **Session 36:** PDF-to-web content conversion and completeness (`stories.ts`, the `.qa` specs).

## What changed (this session)

- **Global search (`/search`)**
  - Server-rendered from the live data, so new stories are included automatically.
  - Searches headlines, printed labels and sections, bylines, standfirsts, full article text, editions (month, year, issue, volume) and categories.
  - Results are grouped as Stories / Editions / Categories. Each story result shows the section, headline, excerpt, byline, edition, category and "Read story →".
  - Every excerpt is source-exact: either the printed standfirst, or the printed passage where the match was found.
  - Terms match at the start of words; terms of three letters or fewer must be whole words.
  - It works without JavaScript (plain GET form).
  - `/search?category=<slug>` doubles as the category listing and `/search` as "All stories", so no new category URLs were created.
  - Search pages are `noindex, follow`, have a canonical `/search` and are not in the sitemap.
- **Navigation**
  - Desktop: Home · Stories ▾ (the categories that have published stories, plus All stories) · Magazine ▾ (latest issue, one entry per year, All editions) · About · Contact, plus a search button.
  - The menus open on hover and on click or Enter, and close with Escape, on leaving, or on navigation.
  - Mobile menu: a search field plus the same groups as sub-links.
- **Footer:** four columns.
  - Explore: categories plus All stories.
  - Magazine: latest issue, one link per year, all editions.
  - About: About Spice Route, NKN Media, Advertising, Contact, Media Kit.
  - Connect: unchanged, verified contacts and socials only.
- **Styling:** all new styles are in `src/app/chrome.css`. This includes a fix for header overflow between 960 and 1099px.
- **QA scripts:** `.qa/contact-qa.mjs` selectors are scoped to `main`. `.qa/responsive-audit.mjs` gained `--widths`, `--out` and the search routes.

## What did NOT change (this session)
Content, story text, images, routes and URLs (only `/search` was added), branding and colours, the homepage, the article pages and the edition pages.

## Content preservation / PDF ↔ web
This is owned by session 36 (`.qa/completeness-audit.mjs` and `completeness-registry.mjs`) and was still in progress during this pass, with the story count growing as the 2024 editions are converted. This session did not modify any story content. Search shows only published data, never paraphrased text.

## Search status
Working. Tested queries:

| Query | Result |
| --- | --- |
| biryani | 4 results |
| kolk (prefix) | 2 results |
| june 2026 | 11 stories + 1 edition |
| tea | 11 results |
| category=cuisine | 4 stories |
| zzqxv | Empty state |
| "ladakh" from the mobile menu | 3 results |

It was also tested in the dark theme.

## Navigation status
Working on desktop (hover, click, keyboard, Escape) and in the mobile menu, with no horizontal scroll.

## Contact form status
`.qa/contact-qa.mjs` passes 53 of 53 checks.

- **Validation:** client-side and server-side. Whitespace-only input, invalid emails, header injection and over-length values are all rejected.
- **Spam protection:** honeypot, minimum fill time, rate limiting (429 with Retry-After) and duplicate suppression.
- **Security:** same-origin check, no-store responses, and submitted details are never echoed back or logged.
- **Delivery:** success is shown only after the SMTP server accepts the message. An SMTP failure produces a real error, and the visitor can retry.
- **Accessibility:** passes, including 320 and 390px touch and keyboard use.

**Production still needs** these Vercel environment variables, followed by a redeploy: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL` are optional. Until they are set, the form returns 503 and offers a pre-filled email to info@nknmedia.in. It never shows a false "sent".

## Responsive QA result
Production build (`next start`), with the build ID checked stable before and after the run.

- **Coverage:** 93 pages (88 sitemap routes, the 404 page and 4 search variants) at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px, plus 16 in-between widths on one page of each template. 981 page loads in total.
- **Clean:** no clipped text, overlapping text, distorted images, broken images, missing alt text or non-WebP images.
- **Found and fixed:** horizontal scroll at 961px (the header), since fixed and re-verified at 959–1100px.
- **Open, in session b2's area:** homepage `.ed-issueindex__title` links are under 24px tall at touch widths. A fix has been sent to b2.
- **Known:** about 30 low-resolution PDF images show slightly soft at large sizes. Higher-resolution originals are needed from NKN.

## SEO
- Canonical, Open Graph and Twitter tags are present on all templates.
- `robots.txt` and `sitemap.xml` are correct (88 URLs, search excluded), and unknown URLs return 404.
- Articles have Article, Periodical, PublicationIssue, Organization and Person structured data.
- **Missing:** BreadcrumbList structured data. The exact snippet has been sent to session b2, which owns the story page.

## Build
- `npm run build`: pass, 94 static pages plus the per-request `/search` and `/api/contact`.
- `tsc --noEmit`: pass.
- `eslint` on the changed files: pass.

## Remaining issues
1. SMTP environment variables in Vercel (above).
2. BreadcrumbList structured data and the homepage index tap targets (session b2).
3. The content completeness audit (session 36) is still in progress.
4. Not yet redeployed. The live site is the earlier deployment, and a redeploy should wait until sessions b2 and 36 finish.
