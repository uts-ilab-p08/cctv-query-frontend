import type { Palette } from "@/types";

/** localStorage key holding the investigator's palette choice. */
export const PALETTE_STORAGE_KEY = "cctvai.palette";

/** Violet is the design's default palette — keep in sync with `src/app/layout.tsx`. */
export const DEFAULT_PALETTE: Palette = "violet";

export function isPalette(value: unknown): value is Palette {
  return value === "violet" || value === "slate" || value === "amber";
}

/**
 * Runs before hydration to stamp the stored palette on <html>, so a slate/amber
 * user never sees a violet first paint. Serialized into an inline script, so it
 * must stay self-contained and reference no module-scope binding.
 *
 * Lives in a plain (non `"use client"`) module: a Server Component (`app/layout.tsx`)
 * interpolates this string directly, and importing a value from a `"use client"`
 * module into server code resolves to an opaque client reference instead of the
 * string itself.
 */
export const paletteInitScript = `(function(){try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(p==="slate"||p==="amber"||p==="violet"){document.documentElement.setAttribute("data-palette",p)}}catch(e){}})()`;
