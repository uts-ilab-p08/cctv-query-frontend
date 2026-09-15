import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { JobStatus, PipelineJob } from "@/types";

interface JobRowProps {
  job: PipelineJob;
}

const statusDotClasses: Record<JobStatus, string> = {
  processing: "bg-review",
  done: "bg-match",
  pending: "bg-ink-3",
};

const statusTextClasses: Record<JobStatus, string> = {
  processing: "text-review",
  done: "text-match",
  pending: "text-ink-3",
};

function statusLabel(job: PipelineJob): string {
  if (job.status === "processing") return `${job.progress}%`;
  if (job.status === "done") return "Annotated";
  return "Pending";
}

export function JobRow({ job }: JobRowProps) {
  return (
    <li className="rounded-card border-hairline bg-panel shadow-glass-sm flex items-center gap-4 border px-[18px] py-3.5">
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClasses[job.status])}
      />

      <div className="min-w-0 flex-1">
        <p className="text-ink mb-0.5 truncate text-[13px] font-semibold">{job.filename}</p>
        <p className="text-ink-3 font-mono text-[11px]">
          {job.camera} · {job.duration} · {job.model} · {job.target}
        </p>
      </div>

      <ProgressBar
        value={job.progress}
        label={`${job.filename} annotation progress`}
        className="w-35 shrink-0"
      />

      <span
        className={cn("w-22 shrink-0 text-right font-mono text-xs", statusTextClasses[job.status])}
      >
        {statusLabel(job)}
      </span>
    </li>
  );
}
