import type { PipelineJob } from "@/types";

export const initialPipelineJobs: PipelineJob[] = [
  {
    id: 1,
    filename: "G423_2026-08-17_raw.mp4",
    camera: "G423",
    duration: "18:20",
    model: "BLIP",
    target: "Remote",
    status: "processing",
    progress: 62,
  },
  {
    id: 2,
    filename: "G299_2026-08-17_raw.mp4",
    camera: "G299",
    duration: "42:05",
    model: "Marlin-2B",
    target: "Local",
    status: "processing",
    progress: 24,
  },
  {
    id: 3,
    filename: "G424_2026-08-16_clip03.mp4",
    camera: "G424",
    duration: "03:12",
    model: "VideoBERT",
    target: "Remote",
    status: "pending",
    progress: 0,
  },
  {
    id: 4,
    filename: "G421_2026-08-16_clip01.mp4",
    camera: "G421",
    duration: "05:48",
    model: "SAM3",
    target: "Local",
    status: "pending",
    progress: 0,
  },
  {
    id: 5,
    filename: "G506_2026-08-15_raw.mp4",
    camera: "G506",
    duration: "27:30",
    model: "Flamingo",
    target: "Remote",
    status: "done",
    progress: 100,
  },
  {
    id: 6,
    filename: "G328_2026-08-15_raw.mp4",
    camera: "G328",
    duration: "33:10",
    model: "BLIP",
    target: "Remote",
    status: "done",
    progress: 100,
  },
];

/** New jobs are numbered above the seeded ones. */
export const jobIdSeed = 100;
