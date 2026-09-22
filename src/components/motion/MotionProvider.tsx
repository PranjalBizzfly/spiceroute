"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import FlightPath from "./FlightPath";

export interface StoryPreview {
  src: string;
  alt: string;
  kicker: string;
}

/**
 * Site-wide motion, applied by class so every page gets the same vocabulary
 * without wrapping its markup. Everything here is progressive: without script,
 * under reduced motion, or without IntersectionObserver, pages are exactly as
 * rendered. Text content is never changed (headline words are only wrapped;
 * counted figures always end on their exact printed value).
 *
 * - Scroll reveals: SINGLE blocks rise into place; GROUP items follow in turn.
 *   Only content that starts below the fold is armed.
 * - Mask reveals: page headlines rise word by word from behind a mask.
 * - Figures count up to their value as they arrive.
 * - Covers tilt toward the pointer, with a soft sheen (fine pointers only).
 * - Buttons lean a few pixels toward the pointer (fine pointers only).
 * - Card photographs zoom toward their subject, not the frame's centre.
 * - Horizontal shelves can be dragged with a mouse and glide to a stop.
 * - Text-only story lists show a small photograph beside the pointer.
 * - Story pages carry a flight-path reading progress (FlightPath).
 */
const SINGLE = [
  ".ed-shead",
  ".ed-article__figure",
  ".ed-gallery",
  ".ed-pullquote",
  ".ed-article__subhead",
  ".ed-article__callouts",
  ".ed-source--close",
  ".ed-pager",
  ".ed-pdfband",
  ".ed-pdfpanel",
  ".ed-about__main",
  ".ed-about__note",
  ".ed-numbers",
  ".ed-advert__grid",
  ".ed-partners__intro",
  ".ed-archive__controls",
  ".ed-form",
].join(",");

const GROUPS = [
  ".ed-row",
  ".ed-related",
  ".ed-editions",
  ".ed-archive__grid",
  ".ed-toc",
  ".ed-index",
  ".ed-gcards",
  ".ed-tiles",
  ".ed-issueindex",
  ".ed-pillars",
  ".ed-gsearch__editions",
].join(",");

/** Page headlines that rise word by word. */
const HEADLINES = ".ed-story__title, .ed-pagehero h1";
/** Figures that count up (their first run of digits). */
const FIGURES = ".ed-figure__value, .ed-fact__value, .ed-pdfpanel__pages > span";
/** Printed covers that tilt toward the pointer. */
const COVERS = ".ed-edition__cover, .ed-issue__cover .ed-cover, .ed-now__cover";
/** Card photographs that zoom toward their subject. */
const FOCAL = ".ed-card__plate img, .ed-tile__media img, .ed-toc__thumb img, .ed-index__thumb img, .ed-voice__portrait img";
/** Buttons that lean toward the pointer. */
const MAGNETIC = ".btn, .ed-shero__btn, .ed-hx__btn";
/** Shelves a mouse can drag. */
const DRAG = ".ed-shelf__track";
/** Text-only story lists that get a pointer-side photograph. */
const PREVIEW_LISTS = ".ed-issueindex, .ed-latest__stories, .ed-archive__hitlist";

/** Longest stagger step count, so long lists never make readers wait. */
const MAX_STEP = 6;
const MAX_WORD = 14;

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Wraps each word of an element's text in a masked span; the text itself is unchanged. */
function splitWords(el: HTMLElement) {
  if (el.dataset.words !== undefined) return;
  el.dataset.words = "";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let i = 0;
  for (const node of nodes) {
    const parts = (node.nodeValue ?? "").split(/(\s+)/);
    if (parts.every((p) => !p.trim())) continue;
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (!part.trim()) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const mask = document.createElement("span");
      mask.className = "ed-word";
      const inner = document.createElement("span");
      inner.className = "ed-word__in";
      inner.style.setProperty("--w", String(Math.min(i++, MAX_WORD)));
      inner.textContent = part;
      mask.appendChild(inner);
      frag.appendChild(mask);
    }
    node.replaceWith(frag);
  }
}

/** Counts the first run of digits in an element up to its value, then restores the exact text. */
function countUp(el: HTMLElement) {
  if (el.dataset.counted !== undefined) return;
  el.dataset.counted = "";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null = null;
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (/\d/.test(t.nodeValue ?? "")) {
      node = t;
      break;
    }
  }
  if (!node) return;
  const original = node.nodeValue ?? "";
  const match = original.match(/\d[\d,]*/);
  if (!match) return;
  const target = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(target) || target < 2) return;
  const grouped = match[0].includes(",");
  const format = (n: number) => (grouped ? n.toLocaleString("en-US") : String(n));
  const start = performance.now();
  const duration = Math.min(1600, 700 + String(target).length * 110);
  const text = node;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    if (t < 1) {
      text.nodeValue = original.replace(match[0], format(Math.round(target * eased)));
      requestAnimationFrame(tick);
    } else {
      text.nodeValue = original;
    }
  };
  requestAnimationFrame(tick);
}

export default function MotionProvider({ previews = {} }: { previews?: Record<string, StoryPreview> }) {
  const pathname = usePathname();
  const isStory = pathname.startsWith("/stories/");

  // Scroll reveals, headline masks and counted figures — per route
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || reduced()) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          if (el.dataset.count !== undefined) countUp(el);
          else el.dataset.motion = "in";
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 }
    );

    const fold = window.innerHeight;
    const arm = (el: HTMLElement, step = 0) => {
      if (el.dataset.motion || el.closest(".ed-reveal, [data-motion], [hidden], dialog")) return;
      // on screen already: leave it exactly as rendered
      if (el.getBoundingClientRect().top < fold * 0.92) return;
      // a section head with a top hairline draws it across as it arrives
      if (el.matches(".ed-shead") && parseFloat(getComputedStyle(el).borderTopWidth) > 0) el.dataset.line = "";
      el.dataset.motion = "armed";
      if (step) el.style.setProperty("--motion-i", String(Math.min(step, MAX_STEP)));
      io.observe(el);
    };

    // Wait a frame so the new route has laid out before measuring
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(GROUPS).forEach((group) => {
        if (group.closest(".ed-reveal")) return;
        let step = 0;
        Array.from(group.children).forEach((child) => {
          if (child instanceof HTMLElement) arm(child, step++);
        });
      });
      document.querySelectorAll<HTMLElement>(SINGLE).forEach((el) => arm(el));

      // Headlines: masked word rise, once, as the page arrives — only while
      // the route entrance is still playing, so a headline already read is
      // never hidden and raised again (e.g. after a slow first load)
      const entrance = document.querySelector<HTMLElement>(".ed-route")?.getAnimations?.()[0];
      if (entrance && entrance.playState === "running") {
        document.querySelectorAll<HTMLElement>(HEADLINES).forEach((h) => {
          if (h.getBoundingClientRect().top < fold) splitWords(h);
        });
      }

      // Figures: count up as they come into view
      document.querySelectorAll<HTMLElement>(FIGURES).forEach((f) => {
        if (f.dataset.counted !== undefined) return;
        f.dataset.count = "";
        io.observe(f);
      });

      // Card photographs zoom toward their subject (their object-position)
      document.querySelectorAll<HTMLImageElement>(FOCAL).forEach((img) => {
        if (img.style.objectPosition) img.style.transformOrigin = img.style.objectPosition;
      });
    });

    const showAll = () => {
      document.querySelectorAll<HTMLElement>('[data-motion="armed"]').forEach((el) => (el.dataset.motion = "in"));
    };
    window.addEventListener("beforeprint", showAll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("beforeprint", showAll);
      io.disconnect();
    };
  }, [pathname]);

  // Pointer effects (fine pointers only): cover tilt, pointer-side previews
  useEffect(() => {
    if (reduced() || !finePointer()) return;

    // --- cover tilt with sheen ---
    let tilted: HTMLElement | null = null;
    let tiltFrame = 0;
    const onTilt = (e: PointerEvent) => {
      const cover = (e.target as Element | null)?.closest<HTMLElement>(COVERS) ?? null;
      if (tilted && tilted !== cover) {
        tilted.removeAttribute("data-tilt");
        tilted = null;
      }
      if (!cover) return;
      tilted = cover;
      if (tiltFrame) return;
      tiltFrame = requestAnimationFrame(() => {
        tiltFrame = 0;
        const r = cover.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cover.dataset.tilt = "";
        cover.style.setProperty("--tilt-x", (-y).toFixed(3));
        cover.style.setProperty("--tilt-y", x.toFixed(3));
        cover.style.setProperty("--tilt-a", `${(Math.hypot(x, y) * 12).toFixed(2)}deg`);
        cover.style.setProperty("--sheen-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        cover.style.setProperty("--sheen-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const endTilt = () => {
      tilted?.removeAttribute("data-tilt");
      tilted = null;
    };

    // --- pointer-side story preview on text-only lists ---
    const card = document.createElement("div");
    card.className = "ed-peek";
    card.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    const label = document.createElement("span");
    label.className = "ed-peek__kicker";
    card.append(img, label);
    document.body.appendChild(card);
    let peekHref = "";
    let peekFrame = 0;
    let px = 0;
    let py = 0;
    const place = () => {
      peekFrame = 0;
      card.style.setProperty("--peek-x", `${px}px`);
      card.style.setProperty("--peek-y", `${py}px`);
    };
    const onPeek = (e: PointerEvent) => {
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="/stories/"]');
      const inList = link?.closest(PREVIEW_LISTS);
      const preview = link && inList && window.innerWidth >= 1024 ? previews[link.getAttribute("href") ?? ""] : undefined;
      if (!preview) {
        if (peekHref) {
          card.dataset.show = "false";
          peekHref = "";
        }
        return;
      }
      const href = link!.getAttribute("href")!;
      if (href !== peekHref) {
        peekHref = href;
        img.src = `/_next/image?url=${encodeURIComponent(preview.src)}&w=384&q=90`;
        label.textContent = preview.kicker;
        card.dataset.show = "true";
      }
      px = e.clientX;
      py = e.clientY;
      if (!peekFrame) peekFrame = requestAnimationFrame(place);
    };
    const hidePeek = () => {
      card.dataset.show = "false";
      peekHref = "";
    };

    // --- magnetic buttons: lean up to a few pixels toward the pointer ---
    let pulled: HTMLElement | null = null;
    const onMagnet = (e: PointerEvent) => {
      const btn = (e.target as Element | null)?.closest<HTMLElement>(MAGNETIC) ?? null;
      if (pulled && pulled !== btn) {
        pulled.style.removeProperty("--mag-x");
        pulled.style.removeProperty("--mag-y");
        pulled = null;
      }
      if (!btn) return;
      pulled = btn;
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--mag-x", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      btn.style.setProperty("--mag-y", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    };

    document.addEventListener("pointermove", onMagnet, { passive: true });
    document.addEventListener("pointermove", onTilt, { passive: true });
    document.addEventListener("pointerleave", endTilt);
    document.addEventListener("pointermove", onPeek, { passive: true });
    window.addEventListener("scroll", hidePeek, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMagnet);
      document.removeEventListener("pointermove", onTilt);
      document.removeEventListener("pointerleave", endTilt);
      document.removeEventListener("pointermove", onPeek);
      window.removeEventListener("scroll", hidePeek);
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      if (peekFrame) cancelAnimationFrame(peekFrame);
      card.remove();
    };
  }, [previews]);

  // Hide the preview when the route changes
  useEffect(() => {
    document.querySelector<HTMLElement>(".ed-peek")?.setAttribute("data-show", "false");
  }, [pathname]);

  // Mouse drag with momentum on horizontal shelves (touch keeps native swipe)
  useEffect(() => {
    if (!finePointer()) return;
    const still = reduced();
    let track: HTMLElement | null = null;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let moved = false;
    let glide = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const t = (e.target as Element | null)?.closest<HTMLElement>(DRAG);
      if (!t || t.scrollWidth <= t.clientWidth) return;
      cancelAnimationFrame(glide);
      track = t;
      startX = lastX = e.clientX;
      startLeft = t.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      moved = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!track) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) {
        moved = true;
        track.dataset.dragging = "";
      }
      const now = performance.now();
      velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX;
      lastT = now;
      track.scrollLeft = startLeft - dx;
      e.preventDefault();
    };
    const onUp = () => {
      if (!track) return;
      const t = track;
      track = null;
      if (!moved) return;
      // swallow the click that ends a drag
      const block = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      t.addEventListener("click", block, { capture: true, once: true });
      setTimeout(() => t.removeEventListener("click", block, { capture: true }), 0);
      // release speed in px per frame, capped so a fling glides a few cards at most
      let v = still ? 0 : Math.max(-36, Math.min(36, velocity * 14));
      const step = () => {
        if (Math.abs(v) < 0.4) {
          delete t.dataset.dragging; // snap points take over from here
          return;
        }
        t.scrollLeft -= v;
        v *= 0.92;
        glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };

    // photographs and links inside a shelf are dragged with it, not on their own
    const noNativeDrag = (e: DragEvent) => {
      if ((e.target as Element | null)?.closest(DRAG)) e.preventDefault();
    };
    document.addEventListener("dragstart", noNativeDrag);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(glide);
      document.removeEventListener("dragstart", noNativeDrag);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return isStory ? <FlightPath target=".ed-story__body" key={pathname} /> : null;
}
