import { cameraNames } from "@/data/cameras";
import { keywordDictionary } from "@/data/keywords";
import type { DetectedKeyword, KeywordKind } from "@/types";

const dropdownTitles: Record<KeywordKind, string> = {
  tag: "Event type",
  camera: "Camera",
  time: "Time range",
};

/**
 * Scan a natural-language query for filter cues and return the chips to offer.
 * Camera cues resolve their options from the live camera directory.
 */
export function detectKeywords(query: string): DetectedKeyword[] {
  if (!query.trim()) return [];

  return keywordDictionary
    .filter((keyword) => keyword.pattern.test(query))
    .map((keyword) => ({
      id: keyword.id,
      label: keyword.label,
      kind: keyword.kind,
      dropdownTitle: dropdownTitles[keyword.kind],
      options: keyword.kind === "camera" ? [...cameraNames] : (keyword.options ?? []),
    }));
}
