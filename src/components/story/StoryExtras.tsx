import Image from "next/image";
import type { StoryExtra } from "@/types";

const isLink = (t: string) => /^(https?:\/\/|www\.)\S+$/i.test(t.trim());
const isEmail = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim());
const isPhone = (t: string) => /^[+\d][\d\s()+-]{7,}$/.test(t.trim());
/** A short line in capitals reads as a printed heading. */
const isHeading = (t: string) => t.length <= 60 && t === t.toUpperCase() && /[A-Z]/.test(t);

/** Printed lines that carry an address or a link become usable on the web. */
function Line({ text }: { text: string }) {
  const t = text.trim();
  if (isLink(t)) {
    const href = t.startsWith("http") ? t : `https://${t}`;
    return (
      <a className="ed-extra__link" href={href} target="_blank" rel="noopener noreferrer">
        {t}
      </a>
    );
  }
  if (isEmail(t)) return <a className="ed-extra__link" href={`mailto:${t}`}>{t}</a>;
  if (isPhone(t)) return <a className="ed-extra__link" href={`tel:${t.replace(/[^\d+]/g, "")}`}>{t}</a>;
  return <>{t}</>;
}

/**
 * Everything else printed around this article in the edition — advertising,
 * 'In Focus' advertorials, SpiceJet service and menu pages, contents pages and
 * reader pages. Each keeps its printed text and pictures, labelled for what it
 * is, and opens in place, so the article above still reads as one story.
 */
export default function StoryExtras({ extras }: { extras: StoryExtra[] }) {
  if (!extras.length) return null;

  return (
    <section className="ed-extras" aria-labelledby="extras-title">
      <h2 id="extras-title" className="ed-extras__head">
        Also printed in this edition
      </h2>
      <p className="ed-extras__note">
        The pages printed around this article — advertising, features and SpiceJet&apos;s own pages — with their printed text and
        pictures.
      </p>

      {extras.map((x, i) => {
        // the first line that reads as a title, for the closed row
        const lead = x.paragraphs.find((p) => !isLink(p) && !isEmail(p) && !isPhone(p) && p.length > 2);
        const rest = x.paragraphs.filter((p) => p !== lead);
        return (
          <details key={`${x.pdfPage}-${i}`} className={`ed-extra ed-extra--${x.kind}`} open={i === 0}>
            <summary className="ed-extra__summary">
              <span className="ed-extra__label">{x.label}</span>
              {lead && <span className="ed-extra__peek">{lead}</span>}
            </summary>

            <div className="ed-extra__body">
              {x.images.length > 0 && (
                <div className="ed-extra__plates">
                  {x.images.map((img) => (
                    <a key={img.src} className="ed-extra__plate" href={img.src} target="_blank" rel="noopener noreferrer">
                      <Image src={img.src} alt="" width={img.width} height={img.height} sizes="160px" loading="lazy" />
                      <span className="visually-hidden">Open the printed picture</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="ed-extra__text">
                {lead && <p className="ed-extra__lead">{lead}</p>}
                {rest.map((p, n) =>
                  isHeading(p) ? (
                    <p key={n} className="ed-extra__sub">
                      {p}
                    </p>
                  ) : (
                    <p key={n}>
                      <Line text={p} />
                    </p>
                  )
                )}
              </div>
            </div>
          </details>
        );
      })}
    </section>
  );
}
