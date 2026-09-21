"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  /** PDF page to open at (a story's first page); the whole edition otherwise. */
  page?: number;
}

export default function PdfViewerModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  page,
}: PdfViewerModalProps) {
  // PDF open parameters: browsers' built-in viewers honour #page=
  const atPage = page ? `#page=${page}` : "";
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll, move focus into the dialog, and close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal to <body> so no ancestor stacking context (cards, reveals, the
  // sticky header) can ever sit above the reader.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — PDF edition reader`}
      // The reader is always dark, like a lightbox, in either theme
      className="ed-scope-dark"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--overlay-bg)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          backgroundColor: "var(--bg-card)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
          <span className="badge" style={{ fontSize: "0.72rem", flex: "none" }}>
            Original PDF
          </span>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--text-heading)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <a
            href={`${pdfUrl}${atPage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ fontSize: "0.78rem" }}
          >
            Open in New Tab ↗
          </a>
          <a
            href={pdfUrl}
            download
            className="btn btn-primary btn-sm"
            style={{ fontSize: "0.78rem" }}
          >
            Download
          </a>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close PDF reader"
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-heading)",
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              fontWeight: 700,
              flex: "none",
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Embedded PDF Frame */}
      <div
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          backgroundColor: "var(--bg-band)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`${pdfUrl}#${page ? `page=${page}&` : ""}toolbar=1&navpanes=1`}
          title={`${title} — full edition PDF`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
    </div>,
    document.body
  );
}
