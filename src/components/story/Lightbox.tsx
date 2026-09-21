"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PrintedCaption, StoryGalleryImage } from "@/types";

/** A gallery photograph with the printed page and captions it belongs to. */
export interface LightboxItem extends StoryGalleryImage {
  printedPages: number[];
  captions: PrintedCaption[];
}

const LightboxContext = createContext<(index: number) => void>(() => {});

/** Opens the story's lightbox at the given photograph (story-wide index). */
export const useLightbox = () => useContext(LightboxContext);

interface LightboxProviderProps {
  items: LightboxItem[];
  /** Story headline, for the dialog's accessible name. */
  title: string;
  children: React.ReactNode;
}

/**
 * One lightbox for all of a story's printed photographs: arrow keys and
 * buttons step through them in printed order, Escape closes, focus stays in
 * the dialog and returns to the photograph that opened it.
 */
export default function LightboxProvider({ items, title, children }: LightboxProviderProps) {
  const [index, setIndex] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((i: number) => {
    opener.current = document.activeElement as HTMLElement | null;
    setIndex(i);
  }, []);

  const close = useCallback(() => {
    setIndex(null);
    opener.current?.focus?.();
  }, []);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {index !== null && items[index] && (
        <LightboxDialog items={items} index={index} setIndex={setIndex} onClose={close} title={title} />
      )}
    </LightboxContext.Provider>
  );
}

interface DialogProps {
  items: LightboxItem[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}

function LightboxDialog({ items, index, setIndex, onClose, title }: DialogProps) {
  const dialog = useRef<HTMLDivElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const item = items[index];
  const count = items.length;
  const step = useCallback((d: number) => setIndex((index + d + count) % count), [index, count, setIndex]);

  // Lock page scroll and move focus in once, when the dialog opens
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" && count > 1) {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft" && count > 1) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Tab" && dialog.current) {
        // keep focus inside the dialog
        const focusable = dialog.current.querySelectorAll<HTMLElement>("button:not([disabled])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step, count]);

  const pages = item.printedPages;
  const pageLabel = `Page${pages.length > 1 ? "s" : ""} ${pages.join("–")} in print`;

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photographs`}
      className={`ed-lightbox ed-scope-dark${item.captions.length ? " ed-lightbox--captioned" : ""}`}
      onClick={onClose}
    >
      <div className="ed-lightbox__bar" onClick={(e) => e.stopPropagation()}>
        <p className="ed-lightbox__count" aria-live="polite">
          <span>
            {index + 1} / {count}
          </span>
          <span className="ed-lightbox__page">{pageLabel}</span>
        </p>
        <button ref={closeButton} type="button" className="ed-lightbox__close" onClick={onClose} aria-label="Close photographs">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <figure className="ed-lightbox__stage">
        <div className="ed-lightbox__frame" onClick={(e) => e.stopPropagation()}>
          <Image
            key={item.src}
            src={item.src}
            alt={item.alt}
            width={item.width}
            height={item.height}
            sizes="(max-width: 900px) 100vw, 1600px"
            className="ed-lightbox__img"
            style={{ ["--w" as string]: `${item.width * 2}px`, ["--r" as string]: (item.width / item.height).toFixed(4) }}
          />
        </div>
        {item.captions.length > 0 && (
          <figcaption className="ed-lightbox__captions" onClick={(e) => e.stopPropagation()}>
            <span className="ed-lightbox__captionhead">Printed on this page</span>
            <PrintedCaptions captions={item.captions} />
          </figcaption>
        )}
      </figure>

      {count > 1 && (
        <>
          <button
            type="button"
            className="ed-lightbox__nav ed-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous photograph"
          >
            <span aria-hidden="true">&larr;</span>
          </button>
          <button
            type="button"
            className="ed-lightbox__nav ed-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next photograph"
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

/** Captions exactly as printed: the lead-in (if any), then each caption. */
export function PrintedCaptions({ captions }: { captions: PrintedCaption[] }) {
  return (
    <>
      {captions.map((c, i) => (
        <span key={i} className="ed-captions">
          {c.label && <span className="ed-captions__label">{c.label}</span>}
          {c.items.map((t, j) => (
            <span key={j} className="ed-captions__item">
              {t}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
