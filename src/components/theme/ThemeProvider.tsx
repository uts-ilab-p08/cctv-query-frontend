"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { Palette } from "@/types";

/** localStorage key holding the investigator's palette choice. */
export const PALETTE_STORAGE_KEY = "cctvai.palette";

/** Violet is the design's default palette — keep in sync with `src/app/layout.tsx`. */
export const DEFAULT_PALETTE: Palette = "violet";

export const PALETTES: ReadonlyArray<{
  id: Palette;
  label: string;
  hint: string;
  swatch: string[];
}> = [
  {
    id: "violet",
    label: "Violet (default)",
    hint: "The system's default dark palette.",
    swatch: ["#0a0718", "#171233", "#7c5cff"],
  },
  {
    id: "slate",
    label: "Slate console",
    hint: "Blue-grey control-room tone. NSW blue accent.",
    swatch: ["#0a0d12", "#10151d", "#0466c8"],
  },
  {
    id: "amber",
    label: "Amber tactical",
    hint: "High-contrast warm charcoal. Amber accent.",
    swatch: ["#14110a", "#1c1710", "#ffc400"],
  },
];

function isPalette(value: unknown): value is Palette {
  return value === "violet" || value === "slate" || value === "amber";
}

interface PaletteContextValue {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

/**
 * Owns the dark-mode accent palette (`data-palette` on `<html>`), independent of
 * the dark/light theme mechanism in `src/lib/theme.ts`. Palette only has a visual
 * effect while `data-theme="dark"` — the CSS selectors for "light" ignore it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>(DEFAULT_PALETTE);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PALETTE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (isPalette(stored)) setPaletteState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", palette);
  }, [palette]);

  const setPalette = useCallback((next: Palette) => {
    setPaletteState(next);
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {
      // Private mode or a storage-disabled browser: the palette still applies for this session.
    }
  }, []);

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext);
}

/**
 * Runs before hydration to stamp the stored palette on <html>, so a slate/amber
 * user never sees a violet first paint. Serialized into an inline script, so it
 * must stay self-contained and reference no module-scope binding.
 */
export const paletteInitScript = `(function(){try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(p==="slate"||p==="amber"||p==="violet"){document.documentElement.setAttribute("data-palette",p)}}catch(e){}})()`;
