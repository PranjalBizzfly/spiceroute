"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EditionEntry } from "@/types";

/** Serializable edition summary plus the verified text it can be found by. */
export interface ArchiveEdition {
  edition: Pick<EditionEntry, "slug" | "title" | "month" | "year" | "volume" | "issue" | "cover" | "pdfUrl" | "storyIds" | "pdfOnly">;
  stories: { title: string; label?: string; section: string; author?: string; href: string }[];
}

interface ArchiveBrowserProps {
  items: ArchiveEdition[];
  years: number[];
  /** Server-rendered edition cards, keyed by slug (keeps card markup on the server). */
  cards: Record<string, React.ReactNode>;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export default function ArchiveBrowser({ items, years, cards }: ArchiveBrowserProps) {
  const [year, setYear] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const q = norm(query.trim());

  const { editions, storyHits } = useMemo(() => {
    const inYear = items.filter((i) => year === "all" || i.edition.year === year);
    if (!q) return { editions: inYear, storyHits: [] as (ArchiveEdition["stories"][number] & { edition: string })[] };
    const hits: (ArchiveEdition["stories"][number] & { edition: string })[] = [];
    const eds = inYear.filter((i) => {
      const e = i.edition;
      const own = [e.title, e.month, String(e.year), `${e.month} ${e.year}`, e.issue ? `issue ${e.issue}` : "", e.volume ? `volume ${e.volume}` : ""];
      const storyMatches = i.stories.filter((s) => norm([s.title, s.label ?? "", s.section, s.author ?? ""].join(" ")).includes(q));
      storyMatches.forEach((s) => hits.push({ ...s, edition: `${e.month} ${e.year}` }));
      return own.some((t) => norm(t).includes(q)) || storyMatches.length > 0;
    });
    return { editions: eds, storyHits: hits };
  }, [items, year, q]);

  const grouped = years
    .map((y) => ({ y, list: editions.filter((i) => i.edition.year === y) }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="ed-archive">
      <div className="ed-archive__controls" role="search">
        <div className="ed-chips" role="group" aria-label="Filter by year">
          <button type="button" className="ed-chip" aria-pressed={year === "all"} onClick={() => setYear("all")}>
            All years <span className="ed-chip__count">{items.length}</span>
          </button>
          {years.map((y) => (
            <button key={y} type="button" className="ed-chip" aria-pressed={year === y} onClick={() => setYear(y)}>
              {y} <span className="ed-chip__count">{items.filter((i) => i.edition.year === y).length}</span>
            </button>
          ))}
        </div>

        <div className="ed-search">
          <label htmlFor="archive-search" className="visually-hidden">
            Search editions and web stories
          </label>
          <input
            id="archive-search"
            type="search"
            className="ed-search__input"
            placeholder="Search by month, year, issue or story"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <p className="ed-archive__count" aria-live="polite">
        {editions.length} {editions.length === 1 ? "edition" : "editions"}
        {q ? ` matching “${query.trim()}”` : ""}
        {year !== "all" ? ` in ${year}` : ""}
        {storyHits.length ? ` · ${storyHits.length} web ${storyHits.length === 1 ? "story" : "stories"}` : ""}
      </p>

      {storyHits.length > 0 && (
        <div className="ed-archive__hits">
          <h2 className="ed-archive__year">Web stories</h2>
          <ul className="ed-archive__hitlist">
            {storyHits.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="ed-archive__hit">
                  <span className="ed-card__cat">{s.section}</span>
                  <span className="ed-archive__hittitle">
                    {s.label ? `${s.title} · ${s.label}` : s.title}
                  </span>
                  <span className="ed-archive__hitmeta">
                    {s.author ? `${s.author} · ` : ""}
                    {s.edition}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="ed-archive__empty">
          <p>No editions match “{query.trim()}”.</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setQuery("");
              setYear("all");
            }}
          >
            Show all editions
          </button>
        </div>
      ) : (
        grouped.map((g) => (
          <section key={g.y} className="ed-archive__group" aria-labelledby={`year-${g.y}`}>
            <h2 id={`year-${g.y}`} className="ed-archive__year">
              {g.y} <span className="ed-archive__yearcount">{g.list.length} {g.list.length === 1 ? "edition" : "editions"}</span>
            </h2>
            <div className="ed-archive__grid">
              {g.list.map((i) => (
                <div key={i.edition.slug}>{cards[i.edition.slug]}</div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
