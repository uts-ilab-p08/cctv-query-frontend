"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { DEFAULT_PALETTE, isPalette, PALETTE_STORAGE_KEY } from "@/lib/palette";
import type { Palette } from "@/types";

export { DEFAULT_PALETTE, PALETTE_STORAGE_KEY } from "@/lib/palette";

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
  {
    id: "linen",
    label: "Soft linen",
    hint: "Warm earth: charcoal brown and ebony. Soft linen accent.",
    swatch: ["#3e4532", "#565f47", "#6a5d48", "#e1dcd1", "#eee9e1"],
  },
  {
    id: "lavender",
    label: "Soft lavender",
    hint: "Twilight: dusky indigo and smoky plum. Blush beige accent.",
    swatch: ["#22223b", "#4a4e69", "#9a8c98", "#c9ada7", "#f2e9e4"],
  },
  {
    id: "magic",
    label: "Midnight magic",
    hint: "Black to electric indigo, with midnight-blue flashes.",
    swatch: ["#02010a", "#04052e", "#140152", "#22007c", "#0d00a4"],
  },
  {
    id: "sea",
    label: "Deep blue sea",
    hint: "Midnight navy and misty blue. Tropical teal accent.",
    swatch: ["#0b132b", "#1c2541", "#3a506b", "#5bc0be", "#6fffe9"],
  },
  {
    id: "blues",
    label: "Midnight blues",
    hint: "Pitch black and stormy navy. Soft lavender accent.",
    swatch: ["#000000", "#0c1821", "#1b2a41", "#324a5f", "#ccc9dc"],
  },
];

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
