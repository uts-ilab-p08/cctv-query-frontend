import type { Palette } from "@/types";

/** localStorage key holding the investigator's palette choice. */
export const PALETTE_STORAGE_KEY = "cctvai.palette";

/** Violet is the design's default palette — keep in sync with `src/app/layout.tsx`. */
export const DEFAULT_PALETTE: Palette = "violet";

const PALETTE_IDS: readonly Palette[] = [
  "violet",
  "slate",
  "amber",
  "linen",
  "lavender",
  "magic",
  "sea",
  "blues",
];

export function isPalette(value: unknown): value is Palette {
  return PALETTE_IDS.includes(value as Palette);
}

/**
 * Runs before hydration to stamp the stored palette on <html>, so a non-default
 * user never sees a violet first paint. Serialized into an inline script, so it
 * must stay self-contained and reference no module-scope binding.
 *
 * Lives in a plain (non `"use client"`) module: a Server Component (`app/layout.tsx`)
 * interpolates this string directly, and importing a value from a `"use client"`
 * module into server code resolves to an opaque client reference instead of the
 * string itself.
 */
export const paletteInitScript = `(function(){try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(${JSON.stringify(PALETTE_IDS)}.indexOf(p)!==-1){document.documentElement.setAttribute("data-palette",p)}}catch(e){}})()`;
