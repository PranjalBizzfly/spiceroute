"use client";

import { useEffect, useRef, useState } from "react";

const SPEED = 40; // px per second: a slow, continuous glide
const RESUME_MS = 6000; // after the reader scrolls, swipes or uses the arrows

/**
 * A horizontally scrolling row (arrow buttons, native swipe) that glides on
 * its own, continuously and seamlessly: the cards are followed by inert,
 * aria-hidden copies, and the scroll position wraps by exactly one set.
 * The glide pauses on hover, keyboard focus and touch, while off screen or in
 * a hidden tab, and whenever the reader presses Pause (WCAG 2.2.2). With
 * reduced motion it never moves by itself and keeps its snap points.
 */
export default function Shelf({ children, label }: { children: React.ReactNode; label: string }) {
  const track = useRef<HTMLUListElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const idleUntil = useRef(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
    idleUntil.current = performance.now() + RESUME_MS;
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCanAnimate(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el || !canAnimate) return;

    // Seamless loop: one inert, hidden copy of the cards after the originals
    const originals = Array.from(el.children) as HTMLElement[];
    if (!originals.length) return;
    const clones = originals.map((node) => {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.setAttribute("aria-hidden", "true");
      copy.setAttribute("inert", "");
      copy.dataset.clone = "true";
      el.appendChild(copy);
      return copy;
    });
    el.classList.add("is-gliding");

    let visible = false;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);

    const hold = () => (idleUntil.current = performance.now() + RESUME_MS);
    el.addEventListener("pointerdown", hold);
    el.addEventListener("wheel", hold, { passive: true });
    el.addEventListener("touchstart", hold, { passive: true });

    let pos = el.scrollLeft;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64); // no jump after a background tab
      last = now;
      const loop = clones[0].offsetLeft - originals[0].offsetLeft;
      const running =
        !pausedRef.current && !hovered.current && !focused.current && visible && !document.hidden && now >= idleUntil.current;
      if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft; // the reader moved it
      if (running && loop > 0) {
        pos += (SPEED * dt) / 1000;
        if (pos >= loop) pos -= loop;
        el.scrollLeft = pos;
      } else if (loop > 0 && el.scrollLeft >= loop) {
        // keep manual scrolling inside the looping range too
        pos = el.scrollLeft - loop;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("wheel", hold);
      el.removeEventListener("touchstart", hold);
      clones.forEach((c) => c.remove());
      el.classList.remove("is-gliding");
    };
  }, [canAnimate]);

  return (
    <div
      className="ed-shelf"
      onMouseEnter={() => (hovered.current = true)}
      onMouseLeave={() => (hovered.current = false)}
      onFocus={() => (focused.current = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) focused.current = false;
      }}
    >
      <ul ref={track} className="ed-shelf__track" aria-label={label}>
        {children}
      </ul>
      <div className="ed-shelf__buttons">
        {canAnimate && (
          <button
            type="button"
            className="ed-hx__btn ed-hx__btn--ink ed-slide__toggle"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? `Play the ${label.toLowerCase()} slide` : `Pause the ${label.toLowerCase()} slide`}
          >
            <span aria-hidden="true" className={paused ? "ed-slide__icon--play" : "ed-slide__icon--pause"} />
          </button>
        )}
        <button type="button" className="ed-hx__btn ed-hx__btn--ink" onClick={() => move(-1)} aria-label="Scroll back">
          <span aria-hidden="true">&larr;</span>
        </button>
        <button type="button" className="ed-hx__btn ed-hx__btn--ink" onClick={() => move(1)} aria-label="Scroll forward">
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  );
}
