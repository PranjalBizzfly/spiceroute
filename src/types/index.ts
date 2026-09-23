/** An edition as stored: only values verified against the edition's own PDF. */
export interface Edition {
  id: string;
  slug: string;
  title: string;
  month: string;
  year: number;
  /** From the printed masthead line; omitted where not verifiable. */
  volume?: number;
  issue?: number;
  /** Cover image of this edition (see coverSource). */
  cover: string;
  coverSource: "site-media" | "pdf-page-1";
  pdfUrl: string;
  pageCount?: number;
  /** Only ever set from a verified source. None exists today. */
  description?: string;
}

/** Minimal reference to an edition, for navigation. */
export interface EditionRef {
  slug: string;
  title: string;
  month: string;
  year: number;
  cover: string;
}

/**
 * Edition with everything derived from the data (never stored by hand):
 * its stories in printed order, PDF-only status and chronological neighbours.
 */
export interface EditionEntry extends Edition {
  storyIds: string[];
  /** true when no stories from this edition are published as web articles. */
  pdfOnly: boolean;
  /** Chronologically previous (older) edition. */
  previousEdition?: EditionRef;
  /** Chronologically next (newer) edition. */
  nextEdition?: EditionRef;
}

/**
 * One block of an article, in printed order. Text is exactly as printed in the
 * edition PDF; inline markup: *italic* and **emphasis** mirror the printed faces.
 */
export type ArticleBlock = (
  | { type: "p"; text: string }
  | { type: "subhead"; text: string; number?: number; level?: 3 }
  | { type: "question"; text: string }
  | { type: "note"; text: string }
  | { type: "list"; items: string[] }
) & {
  /** PDF page the block starts on — places the printed photographs beside it. */
  page?: number;
};

/** Where the article is printed (kept for verification; not all shown). */
export interface StorySource {
  edition: string;
  pdf: string;
  pdfPages: number[];
  printedPages: number[];
  /** The PDF's pages are two-page spreads (printed pages 2p-2 and 2p-1). */
  spreads?: boolean;
  imagePdfPage: number;
  /** Facing page carrying the section running head, for single-page pieces printed without one. */
  sectionPdfPage?: number;
}

export interface Story {
  id: string;
  slug: string;
  /** Printed headline. */
  title: string;
  /** Printed place label set beside some headlines (e.g. "Sittong"). */
  label?: string;
  /** Printed section of the magazine (e.g. "Day in a City", "Face to Face"). */
  section: string;
  /** Web grouping used in URLs and homepage sections. */
  category: string;
  /** Byline exactly as printed in the edition PDF. Omitted when the page has none. */
  author?: string;
  /** Printed credit wording before the name (e.g. "Photos by"); "By" otherwise. */
  bylineLabel?: string;
  /** Role only when printed alongside the byline (e.g. "Cabin Crew"). */
  role?: string;
  date?: string;
  /** Printed standfirst; empty for pieces printed without one (listings, columns). */
  excerpt: string;
  heroImage?: string;
  /** Describes what the image actually shows. */
  heroImageAlt?: string;
  /** Where the image comes from, e.g. "Spice Route - Sept 2026, PDF page 34". */
  heroImageSource?: string;
  /** Caption printed with the hero photograph, if any. */
  heroImageCaption?: string;
  /**
   * Web-use rights for the image. The images were extracted from the official
   * edition PDFs; web licensing is not yet confirmed with NKN Media.
   */
  heroImageLicence: "pending";
  /** The printed article, block by block. Printed standfirst is `excerpt`. */
  body: ArticleBlock[];
  /** Printed call-out boxes, e.g. SpiceJet flight information. */
  callouts?: string[];
  /** Pull quotes exactly as printed on the article pages. */
  pullQuotes?: string[];
  /** The story's other printed photographs, in printed order (lead image excluded). */
  gallery?: StoryGalleryImage[];
  /** Captions exactly as printed, each with the PDF page it is printed on. */
  printedCaptions?: PrintedCaption[];
  /** Reference pieces (e.g. Predictions): each printed subhead opens and closes. */
  collapsible?: boolean;
  source: StorySource;
  editionSlug: string;
  editionTitle: string;
  tags?: string[];
}

/** One photograph from a story's printed pages, extracted from the PDF. */
export interface StoryGalleryImage {
  src: string;
  /** Describes what the photograph shows. */
  alt: string;
  width: number;
  height: number;
  /** PDF page(s) it is printed on — two for a photograph across a spread. */
  pdfPages: number[];
}

/**
 * A caption block as printed, with the PDF page it sits on: an optional
 * printed lead-in (e.g. "Clockwise from top") and its items in printed order.
 */
export interface PrintedCaption {
  pdfPage: number;
  label?: string;
  items: string[];
}

/** Gallery photographs and captions printed on the same page(s). */
export interface GalleryGroup {
  /** PDF page(s) the group is printed on (for the original-PDF link). */
  pdfPages: number[];
  printedPages: number[];
  images: StoryGalleryImage[];
  captions: PrintedCaption[];
}

/** A printed subhead, for "In this story" navigation. */
export interface StorySection {
  id: string;
  text: string;
  number?: number;
}

export interface StoryImage {
  src: string;
  alt: string;
  /** e.g. "Spice Route - Sept 2026, PDF page 34" */
  source: string;
  caption?: string;
  licence: "pending";
}

/** Minimal reference to a story, for previous/next navigation. */
export interface StoryRef {
  slug: string;
  href: string;
  printedTitle: string;
  label?: string;
  section: string;
  image?: string;
  imageAlt?: string;
}

/**
 * Story with the names used across the site and everything derived from the
 * data: reading time, image list and previous/next in printed reading order.
 */
export interface StoryEntry extends Story {
  href: string;
  printedTitle: string;
  standfirst: string;
  /** For meta descriptions: the standfirst, or the opening printed text, shortened. */
  summary: string;
  edition: EditionRef;
  images: StoryImage[];
  captions: string[];
  /** Gallery photographs grouped with the captions printed on their pages. */
  galleryGroups: GalleryGroup[];
  /** Printed subheads, in order, with the anchor ids ArticleBody gives them. */
  sections: StorySection[];
  pdfPages: number[];
  printedPages: number[];
  readingTime: string;
  previousStory?: StoryRef;
  nextStory?: StoryRef;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  suffix?: string;
  prefix?: string;
  subtext?: string;
}

export interface PartnerBrand {
  name: string;
  logo: string;
  description?: string;
}

/**
 * A printed page of an edition that is not an article's own text —
 * advertising, an 'In Focus' advertorial, a SpiceJet service or menu page, a
 * contents or cover page, a reader page. Kept with the article it is printed
 * nearest to. Text is exactly as printed, in printed order.
 */
export interface StoryExtra {
  kind: "advert" | "advertorial" | "spicejet" | "masthead" | "readers" | "page";
  /** Shown above it on the web, e.g. "Advertisement" or "In Focus". */
  label: string;
  pdfPage: number;
  /** The page number as printed, where the edition prints one. */
  printedPage?: number;
  /** Printed text blocks, in printed reading order. */
  paragraphs: string[];
  images: { src: string; width: number; height: number }[];
}
