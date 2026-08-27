import type { KeywordDefinition } from "@/types";

/**
 * Natural-language cues the composer highlights as inline filter chips.
 * `options: null` means the chip is populated from the camera directory.
 */
export const keywordDictionary: KeywordDefinition[] = [
  {
    id: "person",
    label: "Person",
    kind: "tag",
    pattern: /\b(person|people|anyone|someone)\b/i,
    options: ["Person", "Loitering"],
  },
  {
    id: "vehicle",
    label: "Vehicle",
    kind: "tag",
    pattern: /\b(car|vehicle|van|sedan)\b/i,
    options: ["Vehicle"],
  },
  {
    id: "entry",
    label: "Entry",
    kind: "tag",
    pattern: /\b(enter|entered|entry|arrived)\b/i,
    options: ["Entry"],
  },
  {
    id: "exit",
    label: "Exit",
    kind: "tag",
    pattern: /\b(leave|left|exit|departed|departure)\b/i,
    options: ["Exit"],
  },
  {
    id: "time",
    label: "Time filter",
    kind: "time",
    pattern: /\b(after|before|am|pm)\b/i,
    options: ["After 12:00", "After 14:00", "Today", "This week"],
  },
  {
    id: "camera",
    label: "Camera location",
    kind: "camera",
    pattern: /\b(parking|entrance|lobby|dock|stairwell|rear|courtyard|breezeway|bus stop)\b/i,
    options: null,
  },
];
