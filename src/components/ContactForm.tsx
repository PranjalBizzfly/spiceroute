"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/data/siteConfig";
import {
  CONTACT_LIMITS,
  CONTACT_TOPICS,
  type ContactErrors,
  type ContactField,
  type ContactSubmission,
  validateContact,
} from "@/lib/contactForm";

type Values = Omit<ContactSubmission, "topic"> & { topic: string };

type Status =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string; offerEmail?: boolean };

const EMPTY: Values = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  // The source form's select defaults to its first option
  topic: CONTACT_TOPICS[0],
  message: "",
};

const FIELD_ORDER: ContactField[] = ["firstName", "lastName", "email", "phone", "company", "topic", "message"];
const CONTACT_EMAIL = siteConfig.contact.email;
const REQUEST_TIMEOUT_MS = 30_000;

/** A pre-filled email to the verified contact address, for when online sending is unavailable. */
function mailtoHref(v: Values): string {
  const body = [
    `First name: ${v.firstName}`,
    `Last name: ${v.lastName}`,
    `Email: ${v.email}`,
    v.phone ? `Phone: ${v.phone}` : null,
    v.company ? `Company: ${v.company}` : null,
    `Topic: ${v.topic}`,
    "",
    v.message,
  ]
    .filter((line) => line !== null)
    .join("\n");
  const subject = `Website enquiry (${v.topic})`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** What to tell the visitor for each failure the endpoint can report. */
function failureMessage(status: number, code: string | undefined): Status {
  switch (code) {
    case "not_configured":
      return {
        kind: "error",
        message: "Online sending isn’t available at the moment, so your message has not been sent. You can email it to us instead.",
        offerEmail: true,
      };
    case "too_fast":
      return { kind: "error", message: "Please take a moment to check your details, then send your message again." };
    case "in_progress":
      return { kind: "error", message: "Your message is already being sent. Please wait a moment before trying again." };
    case "rate_limited":
      return {
        kind: "error",
        message: "Too many messages have been sent from your connection. Please try again later, or email us instead.",
        offerEmail: true,
      };
    default:
      return {
        kind: "error",
        message:
          status >= 500
            ? "Your message could not be sent because of a problem on our side. Please try again, or email us instead."
            : "Your message could not be sent. Please check your details and try again, or email us instead.",
        offerEmail: true,
      };
  }
}

export default function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [honeypot, setHoneypot] = useState("");
  const shownAt = useRef(0);
  const sending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // When the form became usable (a spam signal: people take a moment to fill it in)
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  // The outcome of a plain form post (sent before this script loaded), passed
  // back in the address by /api/contact; the address is then cleaned
  useEffect(() => {
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("form");
    if (!outcome) return;
    url.searchParams.delete("form");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the address on load
    setStatus(
      outcome === "sent"
        ? { kind: "sent" }
        : outcome === "invalid"
          ? { kind: "error", message: "Your message was not sent: some details were missing or not valid. Please fill in the form again." }
          : failureMessage(outcome === "error" ? 500 : 400, outcome)
    );
  }, []);

  useEffect(() => {
    if (status.kind === "sent") doneRef.current?.focus();
    if (status.kind === "error") alertRef.current?.focus();
  }, [status]);

  const update = (field: keyof Values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error as soon as it is edited
    if (errors[field as ContactField]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const focusFirstInvalid = (found: ContactErrors) => {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      first === "topic" ? 'input[name="topic"]:checked, input[name="topic"]' : `[name="${first}"]`
    );
    el?.focus();
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return; // ignore double submits

    const checked = validateContact(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      setStatus({ kind: "invalid" });
      focusFirstInvalid(checked.errors);
      return;
    }

    sending.current = true;
    setErrors({});
    setStatus({ kind: "submitting" });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...checked.data, hp: honeypot, elapsedMs: Date.now() - shownAt.current }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; code?: string; errors?: ContactErrors }
        | null;

      // Success only when the server confirms delivery
      if (response.ok && result?.ok === true) {
        setStatus({ kind: "sent" });
        return;
      }
      if (result?.code === "invalid" && result.errors) {
        setErrors(result.errors);
        setStatus({ kind: "invalid" });
        focusFirstInvalid(result.errors);
        return;
      }
      setStatus(failureMessage(response.status, result?.code));
    } catch {
      setStatus({
        kind: "error",
        message: "Your message could not be sent — the connection failed or timed out. Please try again, or email us instead.",
        offerEmail: true,
      });
    } finally {
      clearTimeout(timer);
      sending.current = false;
    }
  }

  if (status.kind === "sent") {
    return (
      <div ref={doneRef} className="ed-form ed-form--done" role="status" tabIndex={-1}>
        <p className="ed-form__done-mark" aria-hidden="true">
          &#10003;
        </p>
        <h3 className="ed-form__done-title">Message sent</h3>
        <p className="ed-form__done-text">
          Thank you{values.firstName ? `, ${values.firstName}` : ""}. Your message has been sent to the {siteConfig.name} team, and we will get back
          to you shortly.
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setValues(EMPTY);
            setHoneypot("");
            shownAt.current = Date.now();
            setStatus({ kind: "idle" });
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  const submitting = status.kind === "submitting";
  const errorCount = Object.values(errors).filter(Boolean).length;
  const fieldProps = (field: ContactField) => ({
    id: `cf-${field}`,
    name: field,
    value: values[field],
    onChange: update(field),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `cf-${field}-error` : undefined,
    className: "ed-form__input",
  });
  const error = (field: ContactField) =>
    errors[field] ? (
      <p id={`cf-${field}-error`} className="ed-form__error">
        {errors[field]}
      </p>
    ) : null;
  const required = (
    <>
      <span aria-hidden="true"> *</span>
      <span className="visually-hidden"> (required)</span>
    </>
  );

  return (
    // method/action: a working plain post if this script has not loaded yet
    <form
      ref={formRef}
      id="contact-form"
      className="ed-form"
      method="post"
      action="/api/contact"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
    >
      {status.kind === "invalid" && errorCount > 0 && (
        <div className="ed-form__alert" role="alert">
          Please correct the {errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`} and send
          again.
        </div>
      )}

      {status.kind === "error" && (
        <div ref={alertRef} className="ed-form__alert" role="alert" tabIndex={-1}>
          <p>{status.message}</p>
          {status.offerEmail && (
            <p className="ed-form__alert-action">
              <a href={mailtoHref(values)}>Email your message to {CONTACT_EMAIL}</a>
            </p>
          )}
        </div>
      )}

      <fieldset className="ed-form__topics" aria-describedby={errors.topic ? "cf-topic-error" : undefined}>
        <legend className="ed-form__label">Topic</legend>
        <div className="ed-form__pills">
          {CONTACT_TOPICS.map((topic) => (
            <label key={topic} className="ed-form__pill">
              <input
                type="radio"
                name="topic"
                value={topic}
                checked={values.topic === topic}
                onChange={() => {
                  setValues((v) => ({ ...v, topic }));
                  if (errors.topic) setErrors((e) => ({ ...e, topic: undefined }));
                }}
              />
              <span>{topic}</span>
            </label>
          ))}
        </div>
        {error("topic")}
      </fieldset>

      <div className="ed-form__row">
        <div className="ed-form__field">
          <label htmlFor="cf-firstName" className="ed-form__label">
            First name{required}
          </label>
          <input {...fieldProps("firstName")} type="text" autoComplete="given-name" required maxLength={CONTACT_LIMITS.firstName} />
          {error("firstName")}
        </div>
        <div className="ed-form__field">
          <label htmlFor="cf-lastName" className="ed-form__label">
            Last name{required}
          </label>
          <input {...fieldProps("lastName")} type="text" autoComplete="family-name" required maxLength={CONTACT_LIMITS.lastName} />
          {error("lastName")}
        </div>
      </div>

      <div className="ed-form__row">
        <div className="ed-form__field">
          <label htmlFor="cf-email" className="ed-form__label">
            Email{required}
          </label>
          <input {...fieldProps("email")} type="email" autoComplete="email" inputMode="email" required maxLength={CONTACT_LIMITS.email} />
          {error("email")}
        </div>
        <div className="ed-form__field">
          <label htmlFor="cf-phone" className="ed-form__label">
            Phone <span className="ed-form__optional">(optional)</span>
          </label>
          <input {...fieldProps("phone")} type="tel" autoComplete="tel" maxLength={CONTACT_LIMITS.phone} />
          {error("phone")}
        </div>
      </div>

      <div className="ed-form__field">
        <label htmlFor="cf-company" className="ed-form__label">
          Company <span className="ed-form__optional">(optional)</span>
        </label>
        <input {...fieldProps("company")} type="text" autoComplete="organization" maxLength={CONTACT_LIMITS.company} />
        {error("company")}
      </div>

      <div className="ed-form__field">
        <label htmlFor="cf-message" className="ed-form__label">
          Message{required}
        </label>
        <textarea {...fieldProps("message")} rows={6} required maxLength={CONTACT_LIMITS.message} />
        {error("message")}
      </div>

      {/* Left empty by people; bots that fill every field reveal themselves */}
      <div className="ed-form__hp" aria-hidden="true">
        <label htmlFor="cf-hp">Leave this field empty</label>
        <input id="cf-hp" name="hp" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <div className="ed-form__actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <span className="ed-form__spinner" aria-hidden="true" /> Sending…
            </>
          ) : (
            <>
              Send message <span aria-hidden="true">&rarr;</span>
            </>
          )}
        </button>
        <p className="visually-hidden" role="status" aria-live="polite">
          {submitting ? "Sending your message…" : ""}
        </p>
      </div>
    </form>
  );
}
