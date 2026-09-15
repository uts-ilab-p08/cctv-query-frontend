"use client";

import { JobQueue } from "@/components/pipeline/JobQueue";
import { UploadForm } from "@/components/pipeline/UploadForm";
import { StatCard } from "@/components/ui/StatCard";
import { annotationModels } from "@/data/models";
import { usePipelineSimulation } from "@/hooks/usePipelineSimulation";
import { useAppStore } from "@/store/useAppStore";
import type { StatCardData } from "@/types";

export function PipelineScreen() {
  usePipelineSimulation();

  const jobs = useAppStore((state) => state.pipelineJobs);

  const stats: StatCardData[] = [
    { label: "IN QUEUE", value: jobs.filter((job) => job.status !== "done").length },
    { label: "PROCESSING", value: jobs.filter((job) => job.status === "processing").length },
    { label: "COMPLETED", value: jobs.filter((job) => job.status === "done").length },
    { label: "MODELS AVAILABLE", value: annotationModels.length },
  ];

  return (
    <div className="mx-auto w-full max-w-[1040px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Video Annotation Pipeline</h1>
      <p className="text-ink-2 mb-7 text-sm">
        Feed camera footage without annotations through a captioning/detection model to prepare it
        for semantic search.
      </p>

      <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} size="compact" />
        ))}
      </div>

      <UploadForm />

      {/* Newest submissions surface at the top of the queue. */}
      <JobQueue jobs={[...jobs].reverse()} />
    </div>
  );
}
