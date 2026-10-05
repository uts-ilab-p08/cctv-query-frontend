export type ConfidenceLevel = "high" | "mid" | "low";

/** Confidence is a similarity (score × 100, 1–100): real matches often sit in the 50s
 *  and 60s, so red is kept for really low scores. */
export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 70) return "high";
  if (confidence >= 40) return "mid";
  return "low";
}

const labels = {
  high: "High confidence",
  mid: "Medium confidence",
  low: "Low confidence",
} as const;

/** The level in words — for a tooltip and screen readers, so it never rests on colour. */
export function confidenceLabel(confidence: number): string {
  return labels[confidenceLevel(confidence)];
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
  return textClasses[confidenceLevel(confidence)];
}

export function confidenceBorderClass(confidence: number): string {
  return borderClasses[confidenceLevel(confidence)];
}

export function confidenceBgClass(confidence: number): string {
  return bgClasses[confidenceLevel(confidence)];
}

const cssVars = {
  high: "var(--ok)",
  mid: "var(--warn)",
  low: "var(--bad)",
} as const;

/**
 * Same thresholds as the Tailwind helpers above, but returns the raw
 * `var(--ok|warn|bad)` token — for contexts that must set an inline style
 * (e.g. the metadata overlay's meter, drawn on a themed panel).
 */
export function confidenceVar(confidence: number): string {
  return cssVars[confidenceLevel(confidence)];
}

const onMediaVars = {
  high: "var(--ok-on-media)",
  mid: "var(--warn-on-media)",
  low: "var(--bad-on-media)",
} as const;

/** The status colour for text on the dark score chip over footage (--media-chip),
 *  which stays dark in every theme. */
export function confidenceOnMediaVar(confidence: number): string {
  return onMediaVars[confidenceLevel(confidence)];
}
