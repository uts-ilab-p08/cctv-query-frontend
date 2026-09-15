export type Theme = "dark" | "light";

/** localStorage key holding the investigator's theme choice. */
export const THEME_STORAGE_KEY = "cctv-ai:theme";

/** Dark is the design's default and the server-rendered value. */
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * Runs before hydration to stamp the stored theme on <html>, so a light-theme
 * user never sees a dark first paint. Serialized into an inline script, so it
 * must stay self-contained and reference no module-scope binding.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;
