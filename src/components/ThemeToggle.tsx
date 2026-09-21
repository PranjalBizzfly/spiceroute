"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/*
 * Light / dark theme switch.
 *
 * With no saved choice the site follows the device setting
 * (prefers-color-scheme). Choosing a theme stores it and sets
 * data-theme on <html>; the inline script in the root layout re-applies it
 * before first paint on later visits. Which icon shows, and the switch
 * position, come from the theme tokens in globals.css, so they are right
 * before this component hydrates.
 */

type Theme = "light" | "dark";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const systemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  return forced === "light" || forced === "dark" ? forced : systemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled: the choice lasts for this page only
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // A choice made in another tab applies here too
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    if (event.newValue === "light" || event.newValue === "dark") document.documentElement.dataset.theme = event.newValue;
    else delete document.documentElement.dataset.theme;
    notify();
  };
  media.addEventListener("change", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", onStorage);
  };
}

interface ThemeToggleProps {
  /** "icon" for the header bar; "row" for the mobile menu (label and switch). */
  variant?: "icon" | "row";
}

export default function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  // null during server render and hydration; the real theme right after
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  const dark = theme === "dark";
  const next: Theme = dark ? "light" : "dark";

  return (
    <button
      type="button"
      className={`ed-theme-toggle ed-theme-toggle--${variant}`}
      aria-pressed={theme === null ? undefined : dark}
      title={theme === null ? undefined : `Switch to ${next} theme`}
      onClick={() => applyTheme(currentTheme() === "dark" ? "light" : "dark")}
    >
      {variant === "row" ? (
        <>
          <span className="ed-theme-toggle__label">Dark theme</span>
          <span className="ed-theme-toggle__switch" aria-hidden="true">
            <span className="ed-theme-toggle__knob" />
          </span>
        </>
      ) : (
        <>
          <span className="visually-hidden">Dark theme</span>
          {/* Moon: shown in the light theme */}
          <svg className="ed-theme-toggle__moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path
              d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {/* Sun: shown in the dark theme */}
          <svg className="ed-theme-toggle__sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </>
      )}
    </button>
  );
}
