"use client";

import { useState } from "react";
import PdfViewerModal from "./PdfViewerModal";

interface PdfButtonProps {
  pdfUrl: string;
  /** Edition title, used for the dialog and the accessible name. */
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Open the reader at this PDF page. */
  page?: number;
}

/** Opens the original edition PDF in the existing in-page reader. */
export default function PdfButton({ pdfUrl, title, children, className, page }: PdfButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {children}
        <span className="visually-hidden"> — {title}, opens the PDF reader</span>
      </button>
      <PdfViewerModal isOpen={open} onClose={() => setOpen(false)} pdfUrl={pdfUrl} title={title} page={page} />
    </>
  );
}
