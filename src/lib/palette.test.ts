import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_PALETTE, isPalette, paletteInitScript } from "./palette";

describe("palette registry", () => {
  it("accepts the Soft Linen and Soft Lavender palettes", () => {
    expect(isPalette("linen")).toBe(true);
    expect(isPalette("lavender")).toBe(true);
    expect(isPalette("magic")).toBe(true);
    expect(isPalette("sea")).toBe(true);
    expect(isPalette("blues")).toBe(true);
    expect(isPalette("sepia")).toBe(false);
  });

  it("defaults to Slate console", () => {
    expect(DEFAULT_PALETTE).toBe("slate");
  });

  it("falls back to the default palette's tokens when <html> has no palette yet", () => {
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
    const fallback = css.match(/:root,\s*\[data-theme="dark"\],\s*([^{]+)\{/);

    expect(fallback?.[1].trim()).toBe(`[data-theme="dark"][data-palette="${DEFAULT_PALETTE}"]`);
  });

  it("restores it before first paint, so a reload never flashes the default", () => {
    document.documentElement.removeAttribute("data-palette");
    for (const palette of ["linen", "lavender", "magic", "sea", "blues"]) {
      localStorage.setItem("cctvai.palette", palette);
      new Function(paletteInitScript)();
      expect(document.documentElement.getAttribute("data-palette")).toBe(palette);
    }
  });
});
