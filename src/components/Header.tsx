"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/inflight-magazine", label: "Inflight Magazine" },
  { href: "/contact", label: "Contact" },
];

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
}

export default function Header({ latestEdition, tagline, publisherName }: HeaderProps) {
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
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`ed-navlink${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="desktop-actions ed-header__actions">
          <ThemeToggle />
          <Link
            href={`/inflight-magazine/${latestEdition.slug}`}
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
        <nav className="ed-drawer__nav" aria-label="Mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`ed-drawer__link${pathname === link.href ? " is-active" : ""}`}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ThemeToggle variant="row" />

        <Link
          href={`/inflight-magazine/${latestEdition.slug}`}
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
