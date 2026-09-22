"use client";

import { useState } from "react";
import Image from "next/image";

export interface MarqueeLogo {
  name: string;
  src: string;
  alt: string;
}

/**
 * Partner logos sliding continuously from right to left. The list is drawn
 * twice so the loop is seamless; the second copy is hidden from assistive
 * technology. The slide pauses on hover or keyboard focus and with the Pause
 * button (WCAG 2.2.2); with reduced motion the logos simply sit in a row.
 */
export default function LogoMarquee({ logos, label }: { logos: MarqueeLogo[]; label: string }) {
  const [paused, setPaused] = useState(false);

  const list = (copy: boolean) => (
    <ul className="ed-logos ed-logos--marquee" aria-label={copy ? undefined : label} aria-hidden={copy || undefined}>
      {logos.map((logo) => (
        <li key={logo.name} className="ed-logo partner-logo-item">
          <Image src={logo.src} alt={copy ? "" : logo.alt} fill sizes="108px" loading="lazy" style={{ objectFit: "contain" }} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`ed-marquee${paused ? " is-paused" : ""}`}>
      <div className="ed-marquee__viewport">
        <div className="ed-marquee__track">
          {list(false)}
          {list(true)}
        </div>
      </div>
      <button
        type="button"
        className="ed-hx__btn ed-hx__btn--ink ed-slide__toggle ed-marquee__toggle"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Play the partner logos slide" : "Pause the partner logos slide"}
      >
        <span aria-hidden="true" className={paused ? "ed-slide__icon--play" : "ed-slide__icon--pause"} />
      </button>
    </div>
  );
}
