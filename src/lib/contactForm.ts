/*
 * Contact form rules, shared by the browser (for instant feedback) and the
 * /api/contact route handler (which is authoritative — every request is
 * validated again on the server).
 *
 * Fields follow the source contact form on spiceroutemagazine.in: First Name,
 * Last Name, Email, a topic select (Sales / Marketing / Customer Support) and
 * Message. Phone and Company are optional extras.
 */

// Options of the source form's select, in its order (the first is its default)
export const CONTACT_TOPICS = ["Sales", "Marketing", "Customer Support"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_LIMITS = {
  firstName: 60,
  lastName: 60,
  email: 254,
  phone: 30,
  company: 120,
  messageMin: 10,
  message: 5000,
} as const;

/** Largest request body the endpoint will read, in bytes. */
export const CONTACT_MAX_BODY_BYTES = 16 * 1024;

/** Submissions sent sooner than this after the form appeared are treated as automated. */
export const CONTACT_MIN_FILL_MS = 1500;

export interface ContactSubmission {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  topic: ContactTopic;
  message: string;
}

export type ContactField = keyof ContactSubmission;
export type ContactErrors = Partial<Record<ContactField, string>>;

/** Keys a request body may contain: the fields plus the two spam signals. */
export const CONTACT_PAYLOAD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "topic",
  "message",
  "hp",
  "elapsedMs",
] as const;

// Control characters other than tab / newline; never valid in a form field.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const LINE_BREAK = /[\r\n\v\f]|\p{Zl}|\p{Zp}/u;
// Deliberately simple: one @, no spaces or angle brackets, a dot in the domain.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;
const PHONE = /^\+?[0-9()\s.-]{6,30}$/;

function singleLine(value: string, label: string, max: number, required: boolean): string | undefined {
  if (!value) return required ? `Please enter your ${label}.` : undefined;
  if (value.length > max) return `Please keep your ${label} under ${max} characters.`;
  if (CONTROL.test(value) || LINE_BREAK.test(value)) return `Your ${label} contains characters that are not allowed.`;
  return undefined;
}

/**
 * Validates a submission. Input values are trimmed; whitespace-only values
 * count as empty. Returns the cleaned submission, or an error per field.
 */
export function validateContact(input: Record<string, unknown>):
  | { ok: true; data: ContactSubmission }
  | { ok: false; errors: ContactErrors } {
  const text = (key: ContactField) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const data = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    topic: text("topic"),
    message: text("message").replace(/\r\n?/g, "\n"),
  };

  const errors: ContactErrors = {};
  const set = (field: ContactField, message: string | undefined) => {
    if (message) errors[field] = message;
  };

  set("firstName", singleLine(data.firstName, "first name", CONTACT_LIMITS.firstName, true));
  set("lastName", singleLine(data.lastName, "last name", CONTACT_LIMITS.lastName, true));

  if (!data.email) set("email", "Please enter your email address.");
  else if (data.email.length > CONTACT_LIMITS.email || !EMAIL.test(data.email))
    set("email", "Please enter a valid email address, like name@example.com.");

  if (data.phone && !PHONE.test(data.phone)) set("phone", "Please enter a valid phone number, or leave it empty.");
  set("company", singleLine(data.company, "company name", CONTACT_LIMITS.company, false));

  if (!(CONTACT_TOPICS as readonly string[]).includes(data.topic)) set("topic", "Please choose a topic.");

  if (!data.message) set("message", "Please enter your message.");
  else if (data.message.length < CONTACT_LIMITS.messageMin)
    set("message", `Please write a little more — at least ${CONTACT_LIMITS.messageMin} characters.`);
  else if (data.message.length > CONTACT_LIMITS.message)
    set("message", `Please keep your message under ${CONTACT_LIMITS.message} characters.`);
  else if (CONTROL.test(data.message)) set("message", "Your message contains characters that are not allowed.");

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, data: { ...data, topic: data.topic as ContactTopic } };
}
