"use client";

import { useEffect, useState } from "react";

/** Shown once the reader is this many screen heights down the page. */
const SHOW_AFTER_SCREENS = 1.5;

/**
 * "Back to top": a round button in the bottom corner, shown once the page has
 * been scrolled well down. It scrolls smoothly to the top (instantly for
 * visitors who prefer less motion) and moves keyboard focus to the start of
 * the page content, so the next Tab continues from the top.
 */
export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShown(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    const main = document.getElementById("main-content");
    if (main) {
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    }
  };

  return (
    <button
      type="button"
      className={`ed-totop${shown ? " is-shown" : ""}`}
      onClick={toTop}
      aria-label="Back to top"
      // out of the tab order while hidden
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
