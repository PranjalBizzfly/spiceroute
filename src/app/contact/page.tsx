import type { Metadata } from "next";
import Image from "next/image";
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
      {/* Hero recreated from the source Contact page: the red band, two cabin
          photographs and the 14M+ figure beside the headline and details */}
      <section className="ed-shero ed-shero--contact" aria-labelledby="contact-title">
        <div className="container">
          <nav aria-label="Breadcrumb" className="ed-crumbs ed-shero__crumbs">
            <ol>
              <li><Link href="/">Home</Link></li>
              <li aria-current="page">Contact</li>
            </ol>
          </nav>

          <div className="ed-shero__grid">
            <div className="ed-shero__collage ed-rise">
              <div className="ed-shero__photo ed-shero__photo--one">
                <Image
                  src="/images/hero/contact-reader-1.webp"
                  alt="A passenger reading Spice Route in a SpiceJet cabin"
                  fill
                  priority
                  sizes="(max-width: 767px) 45vw, 270px"
                />
              </div>
              {/* Source Contact page figure */}
              <p className="ed-shero__stat">
                <span className="ed-shero__statnum">14M+</span>
                <span className="ed-shero__statlabel">Passengers Flown in 2024</span>
              </p>
              <div className="ed-shero__photo ed-shero__photo--two">
                <Image
                  src="/images/hero/contact-reader-2.webp"
                  alt="A SpiceJet crew member reading Spice Route on board"
                  fill
                  sizes="(max-width: 767px) 45vw, 270px"
                />
              </div>
            </div>

            <div className="ed-shero__details">
              <h1 id="contact-title" className="ed-shero__title ed-rise" style={{ "--rise-delay": 40 } as React.CSSProperties}>
                Convinced yet? Let&apos;s make something great together.
              </h1>

              <dl className="ed-shero__list ed-rise" style={{ "--rise-delay": 80 } as React.CSSProperties}>
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
          </div>
        </div>
      </section>

      <section className="ed-section" aria-label="Contact form">
        <div className="container">
          <div className="ed-shero-form">
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
