"use client";

import { useEffect, useRef } from "react";

/**
 * Reading progress as a flight: a small aircraft crosses a dotted route along
 * the bottom edge of the header as the reader moves through the story, leaving
 * a solid trail behind it, and settles on the destination dot at the end.
 * Decorative only (the page's own progress is in the scroll position); hidden
 * from assistive technology and absent under reduced motion.
 */
export default function FlightPath({ target }: { target: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(target);
    const node = root.current;
    if (!node) return;
    // stories without running text have nothing to fly across
    if (!el) {
      node.hidden = true;
      return;
    }
    const header = document.querySelector<HTMLElement>(".ed-header");
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const done = span > 0 ? -r.top / span : r.top < 0 ? 1 : 0;
      const p = Math.min(1, Math.max(0, done));
      node.style.setProperty("--flight", p.toFixed(4));
      node.style.setProperty("--flight-top", `${Math.max(0, header?.getBoundingClientRect().bottom ?? 0)}px`);
      node.dataset.state = p <= 0 ? "ground" : p >= 1 ? "landed" : "air";
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
  }, [target]);

  return (
    <div ref={root} className="ed-flight" aria-hidden="true" data-state="ground">
      <span className="ed-flight__route" />
      <span className="ed-flight__trail" />
      <span className="ed-flight__dest" />
      <span className="ed-flight__plane">
        <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
          <path
            fill="currentColor"
            d="M21.5 11.1 14 7.2V3.6c0-.9-.7-1.6-1.5-1.6h-1c-.8 0-1.5.7-1.5 1.6v3.6L2.5 11.1c-.3.2-.5.5-.5.9v1.3c0 .4.4.7.8.5L10 11.6V17l-2.3 1.7c-.2.1-.3.4-.3.6v.9c0 .4.4.6.7.5L12 19.6l3.9 1.1c.3.1.7-.1.7-.5v-.9c0-.2-.1-.5-.3-.6L14 17v-5.4l7.2 2.2c.4.1.8-.1.8-.5V12c0-.4-.2-.7-.5-.9Z"
            transform="rotate(90 12 12)"
          />
        </svg>
      </span>
    </div>
  );
}
