"use client";

import { useEffect, useState } from "react";
import ShareButton from "./ShareButton";

const SIZES = ["standard", "large", "larger"] as const;
type Size = (typeof SIZES)[number];
const KEY = "sr-article-size";

/**
 * The article toolbar: text size (three steps, remembered in this browser),
 * print, and share. Text size scales only the article text.
 */
export default function ArticleTools({ title, path }: { title: string; path: string }) {
  const [size, setSize] = useState<Size>("standard");

  // restore the reader's choice (per browser; a convenience only)
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      /* storage unavailable: keep the default */
    }
    if (saved && (SIZES as readonly string[]).includes(saved)) {
      document.documentElement.dataset.articleSize = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with a stored preference once
      setSize(saved as Size);
    }
  }, []);

  const cycle = () => {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length];
    setSize(next);
    document.documentElement.dataset.articleSize = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page */
    }
  };

  return (
    <div className="ed-news__actions" role="group" aria-label="Article tools">
      <button type="button" className="ed-news__action" onClick={cycle} aria-label={`Text size: ${size}. Change text size`}>
        <span aria-hidden="true" className="ed-news__aa">
          A<span>A</span>
        </span>
        <span className="ed-news__actionlabel">Text size</span>
      </button>
      <button type="button" className="ed-news__action" onClick={() => window.print()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
          <path d="M6 14h12v7H6z" />
        </svg>
        <span className="ed-news__actionlabel">Print</span>
      </button>
      <ShareButton title={title} path={path} />
    </div>
  );
}
