"use client";

import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Stagger in milliseconds, applied as a transition delay. */
  delay?: number;
  as?: "div" | "section" | "article" | "li";
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Section entrance animation.
 *
 * The hidden state is armed from JavaScript (data-armed) and reduced-motion
 * users are skipped entirely, so content is always visible when motion is
 * unwanted or unavailable.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      return;
    }

    // Arm the hidden state only now that we know we can animate it away.
    node.dataset.armed = "true";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className ? `ed-reveal ${className}` : "ed-reveal"}
      style={{ ...style, ["--reveal-delay" as string]: delay }}
    >
      {children}
    </Tag>
  );
}
