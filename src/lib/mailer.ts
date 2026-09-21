import nodemailer from "nodemailer";
import { siteConfig } from "@/data/siteConfig";
import type { ContactSubmission } from "@/lib/contactForm";

/*
 * Server-only: delivers contact form submissions by SMTP. Imported only by the
 * /api/contact route handler, so nothing here reaches the browser bundle.
 *
 * Configuration comes from environment variables (see .env.example). No
 * credentials live in the code. When the required variables are missing the
 * form reports that online sending is unavailable — it never claims success.
 */

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Reads the SMTP settings; undefined when delivery is not configured. */
export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig | undefined {
  const host = env.SMTP_HOST?.trim();
  const port = Number(env.SMTP_PORT);
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASSWORD;
  if (!host || !Number.isInteger(port) || port <= 0 || port > 65535 || !user || !pass) return undefined;

  // Sender must be an address the SMTP account may send as; defaults to the login.
  const from = (env.CONTACT_FROM_EMAIL?.trim() || user).trim();
  // Recipient defaults to the verified contact address (source site and the
  // magazine imprint: "Advertising: info@nknmedia.in").
  const to = env.CONTACT_TO_EMAIL?.trim() || siteConfig.contact.email;
  if (!EMAIL.test(from) || !EMAIL.test(to)) return undefined;

  // Port 465 is implicit TLS; other ports must upgrade with STARTTLS unless
  // explicitly allowed not to (e.g. a trusted internal relay).
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465;
  const requireTLS = !secure && env.SMTP_REQUIRE_TLS !== "false";

  return { host, port, secure, requireTLS, user, pass, from, to };
}

export function isMailConfigured(): boolean {
  return readMailConfig() !== undefined;
}

/** Plain-text body; values were validated and single-line fields contain no line breaks. */
function composeText(s: ContactSubmission): string {
  return [
    "New message from the contact form on the Spice Route website.",
    "",
    `Topic:      ${s.topic}`,
    `First name: ${s.firstName}`,
    `Last name:  ${s.lastName}`,
    `Email:      ${s.email}`,
    `Phone:      ${s.phone || "—"}`,
    `Company:    ${s.company || "—"}`,
    "",
    "Message:",
    s.message,
    "",
    "—",
    "Reply to this email to answer the sender directly.",
  ].join("\n");
}

/**
 * Sends one submission. Resolves when the SMTP server has accepted the
 * message; rejects on any delivery failure (the caller reports it).
 */
export async function sendContactEmail(submission: ContactSubmission): Promise<void> {
  const config = readMailConfig();
  if (!config) throw new Error("mail-not-configured");

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: { user: config.user, pass: config.pass },
    // Fail fast rather than leaving the visitor waiting
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const name = `${submission.firstName} ${submission.lastName}`;
  try {
    const info = await transport.sendMail({
      from: { name: `${siteConfig.name} website`, address: config.from },
      to: config.to,
      replyTo: { name, address: submission.email },
      subject: `Website enquiry (${submission.topic}) from ${name}`,
      text: composeText(submission),
    });
    // The server must have accepted the recipient for this to count as sent
    if (!info.accepted?.length || info.rejected?.length) throw new Error("mail-recipient-rejected");
  } finally {
    transport.close();
  }
}
