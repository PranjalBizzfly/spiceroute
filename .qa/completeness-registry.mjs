// Explicit decisions for printed text blocks that are on an article's PDF
// pages but deliberately not part of its web page. Every entry names the
// block ("<edition>:p<page>b<n>", or a range "…b<a>-b<z>"; ids from
// blocks.mjs) and says why. Each was checked on the page render
// (extract/renders/<edition>-p<page>.png).
//
// Only non-article matter belongs here (advertising, magazine furniture,
// text-layer artefacts of text that IS on the web). Article content that is
// missing from the web is fixed in the article specs, never waved through.
//
// `slug` limits an entry to one story when pages are shared.
export const REGISTRY = {
  // ---- Advertising and SpiceJet service pages sharing a spread ----
  "april-2026:p15b53-b119": { why: "advertisement: Smile Train India CSR page (right half of the spread), incl. its CMYK colour bars" },
  "april-2026:p27b38-b77": { why: "advertisement: flebo.in (right half of the spread)" },
  "april-2026:p29b14-b15": { why: "advertisement: SpiceJet visa service ('Visa on your mind?')" },
  "april-2026:p30b38-b46": { why: "SpiceJet customer-relations notice (right half of the spread)" },
  "april-2026:p35b13-b34": { why: "'Be in the Spotlight!' reader-photo page (left half of the spread) — a separate printed feature, PDF-only" },
  "april-2026:p36b0-b17": { why: "advertisement: SpiceJet charters (half of the spread)" },

  "march-2024:p65b0-b6": { why: "advertisement: Bandhan Mutual Fund (lower half of the page)" },
  "february-2024:p56b5-b54": { why: "'In Focus' advertorial: Bandhan Mutual Fund (lower half of the page)" },
  "july-2026:p28b38-b43": { why: "'In Focus' advertorial: Watch and Jewellery Middle East Show, Sharjah" },
  "july-2026:p28b47-b121": { slug: "whats-trending-july-2026", why: "lettering on the photographed book cover of 'The Sunday Book Bazaar' (blurbs, author note, ISBN, price) — part of the picture, not article text" },
  "august-2026:p60b0": { why: "invisible text left in the PDF text layer — not printed; the printed byline on the page is PALLAVI SINGH, as on the web" },

  // ---- Printed locator maps: their lettering belongs to the map graphic ----
  "march-2024:p16b2": { why: "locator-map lettering ('Map not to scale')" },
  "march-2024:p26b5": { why: "locator-map lettering ('Varanasi and neighbouring regions / Map not to scale')" },
  "march-2024:p28b5": { why: "locator-map lettering ('Bengaluru and neighbouring regions / Map not to scale')" },
  "march-2024:p30b33": { why: "locator-map lettering ('Bagdogra and neighbouring regions / Map not to scale')" },
  "march-2024:p51b4": { why: "locator-map lettering ('Map not to scale')" },
  "march-2024:p51b13": { why: "locator-map lettering ('UTTAR PRADESH')" },
  "april-2024:p26b37": { why: "locator-map lettering ('Leh district')" },

  // ---- Text-layer artefacts of text that is on the web page ----
  "august-2026:p60b9": { why: "letter-spaced section label 'FACE TO FACE'; on the web as the section" },
  "may-2024:p60b2": { why: "headline fragment of 'Hitting the Right Notes' (headline set in pieces); on the web as printed" },
  "april-2024:p52b7": { why: "\"What's More\" split at the apostrophe in the text layer; on the web as printed" },
  "march-2024:p52b3": { why: "\"What's More\" split at the apostrophe in the text layer; on the web as printed" },
  "february-2024:p52b18": { why: "\"What's More\" split at the apostrophe in the text layer; on the web as printed" },
  "february-2024:p61b6": { why: "\"What's More\" split at the apostrophe in the text layer; on the web as printed" },
  "february-2024:p61b8": { why: "\"What's More\" split at the apostrophe in the text layer; on the web as printed" },
  "february-2024:p28b28": { why: "place label 'Tezpur Assam' set without a space in the text layer; on the web" },
  "april-2024:p58b17": { why: "the block runs two passages together; 'Please note that these treatments…' is its own paragraph on the web, both verified present" },
  "april-2024:p66b3": { why: "the block runs two passages together; 'Best place to watch Hindi films…' is on the web with the rapid-fire answers, verified present" },
  "may-2024:p49b0": { why: "two printed photo name labels on one text line; each name (Albina Peters, Rimi Majumdar) is on the web" },
  "march-2024:p68b34": { why: "figures '26.5' and '29' from the printed text ('26.5 million infants and 29 million pregnant women'), verified on the web" },

  "september-2026:p46b7": { why: "headline artwork: 'RAIN-KIS' + one oversized 'S' + 'ED' render as 'Rain-Kissed' (spec titleArtwork, verified on the render)" },
  "september-2026:p46b9": { why: "headline artwork: see p46b7" },
  "june-2026:p76b4": { why: "the folio '70', printed twice in the text layer ('7070')" },
  "april-2026:p34b14": { why: "subhead 'FROM VANITY TO SELF-CARE' — the text layer lacks the space in 'TO SELF-CARE'; on the web as printed" },
  "may-2026:p70b39": { why: "two printed list items set on one text line ('…green chilies' / 'moong-dal chilla'); both are on the web as separate items" },
};
