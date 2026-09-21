import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/siteConfig";
import ContactForm from "@/components/ContactForm";
import { getLatestEdition } from "@/lib/content";

// Source homepage advertising band, verbatim
const description = siteConfig.spiceRoute.advertisingNote;
const latest = getLatestEdition();

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact & Advertising Inquiries | Spice Route Magazine",
  description,
  openGraph: {
    type: "website",
    url: "/contact",
    title: "Contact Spice Route",
    description,
    siteName: "Spice Route Magazine",
    images: [{ url: latest.cover, alt: `Cover of ${latest.title}` }],
  },
  twitter: { card: "summary_large_image", title: "Contact Spice Route", description, images: [latest.cover] },
};

/* Headings, labels and figures follow the source Contact page. */
export default function ContactPage() {
  const { contact } = siteConfig;

  return (
    <div className="ed-page">
      <section className="ed-issue__hero" aria-labelledby="contact-title">
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li aria-current="page">Contact</li>
            </ol>
          </nav>

          <div className="ed-page__head">
            <p className="ed-kicker ed-rise">Contact</p>
            <h1 id="contact-title" className="ed-issue__title ed-rise" style={{ "--rise-delay": 40 } as React.CSSProperties}>
              Convinced yet? <span className="ed-page__em">Let&apos;s make something great together.</span>
            </h1>
          </div>

          <div className="ed-contact">
            <div className="ed-contact__details">
              {/* Source Contact page figure */}
              <p className="ed-contact__figure">
                <span>14 M+</span>
                Passengers Flown in 2024
              </p>

              <dl className="ed-contact__list">
                <div>
                  <dt>Address</dt>
                  <dd>
                    <address>{contact.address}</address>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${contact.phoneDubai.replace(/\s/g, "")}`}>{contact.phoneDubai}</a>
                    <br />
                    <a href={`tel:${contact.phoneIndia.replace(/\s/g, "")}`}>{contact.phoneIndia}</a>
                  </dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>WhatsApp</dt>
                  <dd>
                    <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      {contact.whatsapp}
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="ed-contact__form">
              <h2 className="ed-shead__title">Drop Us a Line</h2>
              <p className="ed-contact__intro">
                Reach out to us from our contact form and we will get back to you shortly.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
