import type { SavedQuery } from "@/types";

export const savedQueries: SavedQuery[] = [
  {
    id: "sq-1",
    text: "Show anyone who entered after the red car arrived",
    savedOn: "Aug 4",
    hits: 4,
  },
  { id: "sq-2", text: "Loitering events longer than 5 minutes", savedOn: "Aug 2", hits: 2 },
  { id: "sq-3", text: "Any vehicle arrivals after 10 PM", savedOn: "Jul 29", hits: 6 },
  { id: "sq-4", text: "Unattended packages at the loading dock", savedOn: "Jul 22", hits: 1 },
];
