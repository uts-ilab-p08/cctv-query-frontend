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

/**
 * The metadata panel floats over the video with a little of the frame showing through
 * (`.glass-overlay`: --panel-solid at --overlay-alpha). Its text must stay legible
 * over any frame, so check the worst cases: a pure white and a pure black frame behind
 * it, with no credit for the blur.
 */
describe("metadata overlay contrast over any frame", () => {
  const alphaMatch = css.match(/--overlay-alpha:\s*(\d+)%/);
  if (!alphaMatch) throw new Error("no --overlay-alpha in globals.css");
  const alpha = Number(alphaMatch[1]) / 100;

  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const hex = (channels: number[]) =>
    `#${channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  const over = (panel: string, frame: string) => {
    const [p, f] = [rgb(panel), rgb(frame)];
    return hex(p.map((c, i) => alpha * c + (1 - alpha) * f[i]));
  };

  const themes: Array<[string, string]> = [
    ["light", '[data-theme="light"]'],
    ...["violet", "slate", "amber", "linen", "lavender", "magic", "sea", "blues"].map(
      (palette): [string, string] => [
        `dark ${palette}`,
        `[data-theme="dark"][data-palette="${palette}"]`,
      ],
    ),
  ];

  for (const [name, selector] of themes) {
    for (const frame of ["#ffffff", "#000000"]) {
      it(`${name}: --text over a ${frame} frame reaches 4.5:1`, () => {
        const theme = tokens(selector);
        expect(contrast(theme.text, over(theme["panel-solid"], frame))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

const allThemes: Array<[string, string]> = [
  ["light", '[data-theme="light"]'],
  ...["violet", "slate", "amber", "linen", "lavender", "magic", "sea", "blues"].map(
    (palette): [string, string] => [
      `dark ${palette}`,
      `[data-theme="dark"][data-palette="${palette}"]`,
    ],
  ),
];

/** The confidence scale (and errors, toasts) is text: it needs 4.5:1 on every surface. */
describe("status colours contrast", () => {
  for (const [name, selector] of allThemes) {
    for (const status of ["ok", "warn", "bad"]) {
      for (const surface of ["bg", "panel-solid"]) {
        it(`${name}: --${status} on --${surface} reaches 4.5:1`, () => {
          const theme = tokens(selector);
          expect(contrast(theme[status], theme[surface])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});

/**
 * The score chip on a thumbnail: `--media-chip` with the frame showing through, so check
 * it over a pure white and a pure black frame. A palette without its own `--*-on-media`
 * uses its plain status colour (`var(--ok)` in the :root block).
 */
describe("score chip contrast over any thumbnail", () => {
  const chip = css.match(/--media-chip:\s*rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/);
  if (!chip) throw new Error("no --media-chip in globals.css");
  const [r, g, b, alpha] = chip.slice(1).map(Number);

  const over = (frame: number) =>
    `#${[r, g, b]
      .map((c) =>
        Math.round(alpha * c + (1 - alpha) * frame)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;

  for (const [name, selector] of allThemes) {
    for (const status of ["ok", "warn", "bad"]) {
      for (const frame of [255, 0]) {
        it(`${name}: ${status} score over a ${frame ? "white" : "black"} frame reaches 4.5:1`, () => {
          const theme = tokens(selector);
          const color = theme[`${status}-on-media`] ?? theme[status];
          expect(contrast(color, over(frame))).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
