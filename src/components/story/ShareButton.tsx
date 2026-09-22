"use client";

import { useState } from "react";

/**
 * Shares the story: the system share sheet where there is one, otherwise the
 * link is copied. The result is announced to screen readers.
 */
export default function ShareButton({ title, path }: { title: string; path: string }) {
  const [status, setStatus] = useState("");

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("Link copied");
    } catch (e) {
      // a cancelled share sheet is not an error
      if ((e as Error)?.name !== "AbortError") setStatus("Could not copy the link");
    }
    window.setTimeout(() => setStatus(""), 2500);
  };

  return (
    <button type="button" className="ed-news__action" onClick={share}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
      </svg>
      <span>{status || "Share"}</span>
      <span className="visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </button>
  );
}
