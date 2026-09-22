"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface ChapterItem {
  href: string;
  title: string;
  kicker: string;
  excerpt?: string;
  image: string;
  alt: string;
  focus: string;
  meta: string;
}

/**
 * A scroll-told chapter: the stories run down one column while their lead
 * photographs cross-fade in a sticky frame beside them. On narrow screens each
 * story simply carries its own photograph.
 */
export default function StoryChapter({ items }: { items: ChapterItem[] }) {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const nodes = list.current?.querySelectorAll<HTMLElement>("[data-chapter]");
    if (!nodes?.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.chapter));
        });
      },
      // the story crossing the middle of the viewport is the one shown
      { rootMargin: "-45% 0px -45% 0px" }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="ed-chapter">
      <div className="ed-chapter__frame" aria-hidden="true">
        {items.map((it, i) => (
          <div key={it.href} className={`ed-chapter__photo${i === active ? " is-active" : ""}`}>
            <Image src={it.image} alt="" fill sizes="(max-width: 899px) 1px, 50vw" style={{ objectPosition: it.focus }} />
          </div>
        ))}
        <p className="ed-chapter__count">
          <span>{String(active + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}
        </p>
      </div>

      <ol ref={list} className="ed-chapter__list">
        {items.map((it, i) => (
          <li key={it.href} className={`ed-chapter__item${i === active ? " is-active" : ""}`} data-chapter={i}>
            <div className="ed-chapter__inline">
              <Image src={it.image} alt={it.alt} fill sizes="(max-width: 899px) 92vw, 1px" style={{ objectPosition: it.focus }} />
            </div>
            <p className="ed-chapter__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</p>
            <p className="ed-chapter__kicker">{it.kicker}</p>
            <h3 className="ed-chapter__title">
              <Link href={it.href}>{it.title}</Link>
            </h3>
            {it.excerpt && <p className="ed-chapter__excerpt">{it.excerpt}</p>}
            <p className="ed-chapter__meta">{it.meta}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
