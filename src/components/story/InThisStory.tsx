"use client";

import { useEffect, useState } from "react";
import type { StorySection } from "@/types";

/**
 * "In this story": the printed subheads as a contents list. A rail beside the
 * text on wide screens (highlighting the section being read), a collapsible
 * list above the text elsewhere.
 */
export default function InThisStory({ sections }: { sections: StorySection[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const heads = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    let frame = 0;
    const update = () => {
      frame = 0;
      // the last subhead that has passed the upper third of the screen
      const line = window.innerHeight * 0.33;
      let current: string | null = null;
      for (const el of heads) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
        else break;
      }
      setActive(current);
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
  }, [sections]);

  // A section that opens and closes (reference pieces) is opened when chosen
  const reveal = (id: string) => {
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
  };

  const list = (onPick?: React.MouseEventHandler<HTMLAnchorElement>) => (
    <ol className="ed-instory__list">
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            aria-current={active === s.id ? "location" : undefined}
            onClick={(e) => {
              reveal(s.id);
              onPick?.(e);
            }}
          >
            {s.number !== undefined && (
              <span className="ed-instory__num" aria-hidden="true">
                {s.number}
              </span>
            )}
            <span>{s.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav className="ed-instory" aria-label="In this story">
      <details className="ed-instory__compact">
        <summary>
          <span className="ed-instory__title">In this story</span>
          <span className="ed-instory__count">{sections.length} sections</span>
        </summary>
        {list((e) => e.currentTarget.closest("details")?.removeAttribute("open"))}
      </details>
      <div className="ed-instory__rail">
        <p className="ed-instory__title">In this story</p>
        {list()}
      </div>
    </nav>
  );
}
