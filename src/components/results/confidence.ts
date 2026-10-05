type ConfidenceLevel = "high" | "mid" | "low";

/**
 * The search's score runs the whole 1–100 range, and a real match often sits in the
 * 50s–60s: red is kept for the scores that are really low. (At the old 85/65 cut most
 * genuine matches read as bad.)
 */
export const HIGH_CONFIDENCE = 70;
export const LOW_CONFIDENCE = 40;

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= HIGH_CONFIDENCE) return "high";
  if (confidence >= LOW_CONFIDENCE) return "mid";
  return "low";
}

/** SPEC §4 — the confidence scale maps to --match / --review / --flag. */
const textClasses = {
  high: "text-match",
  mid: "text-review",
  low: "text-flag",
} as const;

const borderClasses = {
  high: "border-match",
  mid: "border-review",
  low: "border-flag",
} as const;

const bgClasses = {
  high: "bg-match",
  mid: "bg-review",
  low: "bg-flag",
} as const;

export function confidenceTextClass(confidence: number): string {
  return textClasses[getConfidenceLevel(confidence)];
}

export function confidenceBorderClass(confidence: number): string {
  return borderClasses[getConfidenceLevel(confidence)];
}

export function confidenceBgClass(confidence: number): string {
  return bgClasses[getConfidenceLevel(confidence)];
}

const labels = { high: "High", mid: "Medium", low: "Low" } as const;

/** The level in words — so the score never relies on its colour alone. */
export function confidenceLabel(confidence: number): string {
  return `${labels[getConfidenceLevel(confidence)]} confidence`;
}

const cssVars = {
  high: "var(--ok)",
  mid: "var(--warn)",
  low: "var(--bad)",
} as const;

/**
 * Same thresholds as the Tailwind helpers above, but returns the raw
 * `var(--ok|warn|bad)` token — for contexts that must set an inline `color`
 * or `background` on a themed surface (the metadata panel's meter).
 */
export function confidenceVar(confidence: number): string {
  return cssVars[getConfidenceLevel(confidence)];
}

const mediaVars = {
  high: "var(--ok-on-media)",
  mid: "var(--warn-on-media)",
  low: "var(--bad-on-media)",
} as const;

/**
 * The same scale for text on the dark `--media-chip` over a thumbnail. The plain
 * tokens are dark inks in the light theme, unreadable there (and all alike, so every
 * score looked red).
 */
export function confidenceMediaVar(confidence: number): string {
  return mediaVars[getConfidenceLevel(confidence)];
}
