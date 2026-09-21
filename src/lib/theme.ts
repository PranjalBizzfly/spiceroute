/** localStorage key for the visitor's theme choice ("light" | "dark"). */
export const THEME_STORAGE_KEY = "sr-theme";

/**
 * Inline script for the top of <body>: re-applies a saved theme choice before
 * the page paints, so there is no flash of the other theme. With no saved
 * choice it does nothing and the device setting applies.
 */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
