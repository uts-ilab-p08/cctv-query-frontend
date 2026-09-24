import { describe, expect, it } from "vitest";

import { isPalette, paletteInitScript } from "./palette";

describe("palette registry", () => {
  it("accepts the Soft Linen and Soft Lavender palettes", () => {
    expect(isPalette("linen")).toBe(true);
    expect(isPalette("lavender")).toBe(true);
    expect(isPalette("magic")).toBe(true);
    expect(isPalette("sea")).toBe(true);
    expect(isPalette("blues")).toBe(true);
    expect(isPalette("sepia")).toBe(false);
  });

  it("restores it before first paint, so a reload never flashes violet", () => {
    document.documentElement.removeAttribute("data-palette");
    for (const palette of ["linen", "lavender", "magic", "sea", "blues"]) {
      localStorage.setItem("cctvai.palette", palette);
      new Function(paletteInitScript)();
      expect(document.documentElement.getAttribute("data-palette")).toBe(palette);
    }
  });
});
