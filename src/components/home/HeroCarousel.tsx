"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import "@/app/hero-slide.css";

export interface HeroSlide {
  href: string;
  title: string;
  kicker: string;
  excerpt?: string;
  image: string;
  alt: string;
  focus: string;
  edition: string;
}

/** An optional first slide that is not a story, e.g. the brand statement. */
export interface HeroIntro {
  /** Name on its tab */
  title: string;
  node: React.ReactNode;
}

const INTERVAL = 7000;

/**
 * The homepage opening: the brand slide (when given), then the latest issues'
 * lead photographs, full bleed, one at a time. Advances on its own every
 * INTERVAL; the pause button stops it, keyboard focus inside holds the
 * current slide, and every slide can be chosen from its tab.
 */
export default function HeroCarousel({ slides, label, intro }: { slides: HeroSlide[]; label: string; intro?: HeroIntro }) {
  const [active, setActive] = useState(0);
  // The intro, when given, is slide 0; story slides follow it
  const offset = intro ? 1 : 0;
  const count = slides.length + offset;
  const tabs = [...(intro ? [{ key: "intro", title: intro.title }] : []), ...slides.map((s) => ({ key: s.href, title: s.title }))];
  // the play/pause button
  const [choice, setChoice] = useState<"play" | "pause">("play");
  const [held, setHeld] = useState(false);
  const root = useRef<HTMLElement>(null);
  // Slides change on their own; the pause button stops them (WCAG 2.2.2).
  // Under reduced motion the slides still change, but without the fades and
  // push-in (see the reduced-motion rules in the CSS).
  const playing = choice !== "pause";

  const go = useCallback((i: number) => setActive((i + count) % count), [count]);

  useEffect(() => {
    if (!playing || held) return;
    const t = window.setTimeout(() => go(active + 1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [active, playing, held, go]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(active + 1);
    else if (e.key === "ArrowLeft") go(active - 1);
  };

  return (
    <section
      ref={root}
      className={`ed-hx${playing && !held ? " is-playing" : ""}`}
      aria-roledescription="carousel"
      aria-label={label}
      // Keyboard focus inside the carousel holds the slide being read; a
      // mouse click on a tab does not stop the slideshow
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setHeld(true);
      }}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setHeld(false);
      }}
      onKeyDown={onKey}
      style={{ "--hx-interval": `${INTERVAL}ms` } as React.CSSProperties}
    >
      <div className="ed-hx__slides">
        {intro && (
          <div
            className={`ed-hx__slide ed-hx__slide--intro${active === 0 ? " is-active" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`1 of ${count}`}
            aria-hidden={active !== 0}
            inert={active !== 0}
          >
            {intro.node}
          </div>
        )}
        {slides.map((s, j) => {
          const i = j + offset;
          return (
          <div
            key={s.href}
            className={`ed-hx__slide${i === active ? " is-active" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== active}
            inert={i !== active}
          >
            <div className="ed-hx__media">
              <Image
                src={s.image}
                alt={s.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                style={{ objectPosition: s.focus }}
              />
            </div>
            <div className="container ed-hx__inner">
              <div className="ed-hx__text">
                <p className="ed-hx__kicker">
                  <span>{s.kicker}</span>
                  <span className="ed-hx__edition">{s.edition}</span>
                </p>
                <h2 className="ed-hx__title">
                  <Link href={s.href} className="ed-hx__link">
                    {s.title}
                  </Link>
                </h2>
                {s.excerpt && <p className="ed-hx__excerpt">{s.excerpt}</p>}
                <span className="ed-hx__cta" aria-hidden="true">
                  Read the story <span className="ed-hx__arrow">&rarr;</span>
                </span>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="container ed-hx__controls">
        <div className="ed-hx__tabs" role="group" aria-label="Choose a slide">
          {tabs.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`ed-hx__tab${i === active ? " is-active" : ""}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => go(i)}
            >
              <span className="ed-hx__bar" aria-hidden="true">
                {/* remounted so the bar restarts with the timer */}
                <span key={i === active ? `on-${active}-${held}` : "off"} className="ed-hx__fill" />
              </span>
              <span className="ed-hx__tabnum" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="ed-hx__tabtitle">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="ed-hx__buttons">
          <button type="button" className="ed-hx__btn" onClick={() => go(active - 1)} aria-label="Previous slide">
            <span aria-hidden="true">&larr;</span>
          </button>
          <button
            type="button"
            className="ed-hx__btn"
            onClick={() => setChoice(playing ? "pause" : "play")}
            aria-label={playing ? "Pause the slideshow" : "Play the slideshow"}
          >
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          </button>
          <button type="button" className="ed-hx__btn" onClick={() => go(active + 1)} aria-label="Next slide">
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
  );
}
