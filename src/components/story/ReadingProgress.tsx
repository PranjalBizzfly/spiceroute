"use client";

import { useEffect, useRef } from "react";

/** A thin bar at the top of the screen showing how far through the text the reader is. */
export default function ReadingProgress({ target }: { target: string }) {
  const bar = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el || !bar.current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const done = span > 0 ? -r.top / span : r.top < 0 ? 1 : 0;
      bar.current?.style.setProperty("--progress", String(Math.min(1, Math.max(0, done))));
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

  return <div ref={bar} className="ed-progress" aria-hidden="true" />;
}
