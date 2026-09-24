import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards the theme tokens against WCAG AA text contrast (4.5:1). Reads the real
 * globals.css so a colour change that breaks legibility fails here, not in review.
 */
const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no block for ${selector}`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    out[name] = value;
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("light theme contrast", () => {
  const light = tokens('[data-theme="light"]');

  for (const text of ["text", "text-2", "text-3", "accent", "accent-strong"]) {
    for (const surface of ["bg", "panel-solid"]) {
      it(`--${text} on --${surface} reaches 4.5:1`, () => {
        expect(contrast(light[text], light[surface])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe.each(["violet", "slate", "amber", "linen", "lavender", "magic", "sea", "blues"])(
  "dark %s palette contrast",
  (palette) => {
    const dark = tokens(`[data-theme="dark"][data-palette="${palette}"]`);

    for (const text of ["text", "text-2", "text-3", "accent", "accent-strong"]) {
      for (const surface of ["bg", "panel-solid"]) {
        it(`--${text} on --${surface} reaches 4.5:1`, () => {
          expect(contrast(dark[text], dark[surface])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  },
);
