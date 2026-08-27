import { getConfidenceLevel } from "@/lib/clips";

/** Text colour classes for the confidence scale. */
const textClasses = {
  high: "text-conf-high",
  mid: "text-conf-mid",
  low: "text-conf-low",
} as const;

/** Border colour classes for the confidence badge. */
const borderClasses = {
  high: "border-conf-high",
  mid: "border-conf-mid",
  low: "border-conf-low",
} as const;

/** Background colour classes for the timeline markers. */
const bgClasses = {
  high: "bg-conf-high",
  mid: "bg-conf-mid",
  low: "bg-conf-low",
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
