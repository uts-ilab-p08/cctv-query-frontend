import { getConfidenceLevel } from "@/lib/clips";

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

const cssVars = {
  high: "var(--ok)",
  mid: "var(--warn)",
  low: "var(--bad)",
} as const;

/**
 * Same 85/65 thresholds as the Tailwind helpers above, but returns the raw
 * `var(--ok|warn|bad)` token — for contexts that must set an inline `color`
 * (overlays drawn on top of video, where a fixed value is intentional and
 * cannot go through a Tailwind utility class).
 */
export function confidenceVar(confidence: number): string {
  return cssVars[getConfidenceLevel(confidence)];
}
