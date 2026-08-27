import type { ClipTag } from "@/types";

/** Camera codes indexed for the active precinct, in directory order. */
export const cameraNames = [
  "G299",
  "G301",
  "G328",
  "G420",
  "G421",
  "G423",
  "G424",
  "G506",
] as const;

/** Event types available as filter chips. */
export const tagNames: ClipTag[] = [
  "Person",
  "Vehicle",
  "Entry",
  "Exit",
  "Loitering",
  "Object Left",
];
