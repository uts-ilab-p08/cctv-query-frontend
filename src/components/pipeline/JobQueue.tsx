import { JobRow } from "@/components/pipeline/JobRow";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { PipelineJob } from "@/types";

interface JobQueueProps {
  jobs: PipelineJob[];
}

export function JobQueue({ jobs }: JobQueueProps) {
  return (
    <section>
      <SectionLabel>PIPELINE QUEUE</SectionLabel>
      <ul className="flex list-none flex-col gap-2.5 p-0">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </ul>
    </section>
  );
}
