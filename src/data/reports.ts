import type { Report } from "@/types";

export const reports: Report[] = [
  {
    id: "rp-1",
    title: "Weekly Activity Summary",
    range: "Aug 4 – Aug 10",
    cameras: 8,
    generatedOn: "Aug 11",
  },
  {
    id: "rp-2",
    title: "Perimeter Entry/Exit Log",
    range: "Aug 1 – Aug 7",
    cameras: 3,
    generatedOn: "Aug 8",
  },
  {
    id: "rp-3",
    title: "Loitering Incidents Report",
    range: "Jul 25 – Jul 31",
    cameras: 5,
    generatedOn: "Aug 1",
  },
  {
    id: "rp-4",
    title: "Vehicle Activity Digest",
    range: "Jul 18 – Jul 24",
    cameras: 4,
    generatedOn: "Jul 25",
  },
];

export const averageConfidenceLabel = "84%";
