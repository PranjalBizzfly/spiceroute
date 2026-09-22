"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

interface MenuLink {
  href: string;
  label: string;
}

const SearchIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Desktop dropdown: opens on hover (fine pointers) and on click/Enter; Escape or leaving closes it. */
function NavMenu({ id, label, href, allLabel, links, active }: { id: string; label: string; href: string; allLabel: string; links: MenuLink[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        wrapRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hoverable = () => window.matchMedia("(hover: hover)").matches;

  return (
    <div
      ref={wrapRef}
      className={`ed-navmenu${open ? " is-open" : ""}`}
      onMouseEnter={() => hoverable() && setOpen(true)}
      onMouseLeave={() => hoverable() && setOpen(false)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={`ed-navlink ed-navmenu__toggle${active ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls={id}
        // a mouse on a hover device already opened it on enter; clicks from
        // keyboard or touch toggle
        onClick={(e) => setOpen((o) => (e.detail > 0 && hoverable() ? true : !o))}
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 10 6" width="10" height="6">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <div id={id} className="ed-navmenu__panel" hidden={!open}>
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="ed-navmenu__link">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={href} className="ed-navmenu__all">
          {allLabel} <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

interface HeaderProps {
  /** Passed from the server layout so the edition data stays out of the client bundle. */
  latestEdition: {
    slug: string;
    month: string;
    year: number;
    issue?: number;
  };
  tagline: string;
  publisherName: string;
  /** Story categories that have published stories. */
  storyMenu: MenuLink[];
  /** Years with editions, newest first. */
  years: number[];
}

export default function Header({ latestEdition, tagline, publisherName, storyMenu, years }: HeaderProps) {
  const latestHref = `/inflight-magazine/${latestEdition.slug}`;
  const magazineMenu: MenuLink[] = [
    { href: latestHref, label: `Latest issue · ${latestEdition.month} ${latestEdition.year}` },
    ...years.map((y) => ({ href: `/inflight-magazine#year-${y}`, label: `${y} editions` })),
  ];
  const simple = (href: string, label: string, cls: string) => (
    <Link key={href} href={href} className={`${cls}${pathname === href ? " is-active" : ""}`} aria-current={pathname === href ? "page" : undefined}>
      {label}
    </Link>
  );
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the drawer whenever the route changes (including back/forward)
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMobileMenuOpen(false);
  }

  // Escape closes the drawer; lock background scroll while it is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    // Escape closes the menu and returns focus to its toggle
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <header
      ref={headerRef}
      className={`ed-header${scrolled ? " is-scrolled" : ""}`}
      onBlur={(event) => {
        // The open menu covers the page: if keyboard focus leaves the header,
        // close it rather than let focus move to content hidden behind it.
        if (mobileMenuOpen && event.relatedTarget && !headerRef.current?.contains(event.relatedTarget as Node)) {
          setMobileMenuOpen(false);
        }
      }}
    >
      {/* Masthead rule — verified issue line */}
      <div className="ed-header__masthead">
        <div className="container ed-header__masthead-inner">
          <span>{tagline}</span>
          <span className="ed-header__masthead-issue">
            {latestEdition.issue
              ? `Issue ${latestEdition.issue} · ${latestEdition.month} ${latestEdition.year}`
              : `${latestEdition.month} ${latestEdition.year}`}
          </span>
        </div>
      </div>

      <div className="container ed-header__bar">
        <Link href="/" className="ed-header__logo" aria-label="Spice Route — home">
          <Image
            src="/images/spice-route-logo.webp"
            alt="Spice Route — The Inflight Magazine of SpiceJet"
            fill
            loading="eager"
            sizes="190px"
            style={{ objectFit: "contain", objectPosition: "left center" }}
          />
        </Link>

        <nav className="desktop-nav ed-header__nav" aria-label="Primary">
          {simple("/", "Home", "ed-navlink")}
          <NavMenu id="menu-stories" label="Stories" href="/search" allLabel="All stories" links={storyMenu} active={pathname.startsWith("/stories") || pathname === "/search"} />
          <NavMenu id="menu-magazine" label="Magazine" href="/inflight-magazine" allLabel="All editions" links={magazineMenu} active={pathname.startsWith("/inflight-magazine")} />
          {simple("/about", "About", "ed-navlink")}
          {simple("/contact", "Contact", "ed-navlink")}
        </nav>

        <div className="desktop-actions ed-header__actions">
          <Link href="/search" className="ed-searchbtn" aria-label="Search Spice Route">
            <SearchIcon />
          </Link>
          <ThemeToggle />
          <Link
            href={latestHref}
            className="btn btn-primary btn-sm"
            style={{ letterSpacing: "0.06em", fontWeight: 700 }}
          >
            Read {latestEdition.month} {latestEdition.year}
          </Link>
        </div>

        <button
          type="button"
          ref={toggleRef}
          className="mobile-toggle ed-header__toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span className={`ed-burger${mobileMenuOpen ? " is-open" : ""}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-navigation"
        className={`ed-drawer${mobileMenuOpen ? " is-open" : ""}`}
        hidden={!mobileMenuOpen}
      >
        <form action="/search" method="get" role="search" className="ed-drawer__search">
          <label htmlFor="drawer-search" className="visually-hidden">
            Search Spice Route
          </label>
          <input id="drawer-search" type="search" name="q" placeholder="Search Spice Route…" autoComplete="off" maxLength={100} />
          <button type="submit" aria-label="Search">
            <SearchIcon />
          </button>
        </form>

        <nav className="ed-drawer__nav" aria-label="Mobile">
          {simple("/", "Home", "ed-drawer__link")}
          <div className="ed-drawer__group">
            {simple("/search", "Stories", "ed-drawer__link")}
            <ul className="ed-drawer__sub" aria-label="Story categories">
              {storyMenu.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="ed-drawer__group">
            {simple("/inflight-magazine", "Magazine", "ed-drawer__link")}
            <ul className="ed-drawer__sub" aria-label="Editions">
              {magazineMenu.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          {simple("/about", "About", "ed-drawer__link")}
          {simple("/contact", "Contact", "ed-drawer__link")}
        </nav>

        <ThemeToggle variant="row" />

        <Link
          href={latestHref}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          Read {latestEdition.month} {latestEdition.year} Issue
        </Link>

        <p className="ed-drawer__foot">
          Spice Route — published by {publisherName} for SpiceJet
        </p>
      </div>
    </header>
  );
}
