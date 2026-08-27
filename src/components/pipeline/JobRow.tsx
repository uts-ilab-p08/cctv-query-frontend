import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { JobStatus, PipelineJob } from "@/types";

interface JobRowProps {
  job: PipelineJob;
}

const statusDotClasses: Record<JobStatus, string> = {
  processing: "bg-conf-mid",
  done: "bg-conf-high",
  pending: "bg-ink-subtle",
};

const statusTextClasses: Record<JobStatus, string> = {
  processing: "text-conf-mid",
  done: "text-conf-high",
  pending: "text-ink-subtle",
};

function statusLabel(job: PipelineJob): string {
  if (job.status === "processing") return `${job.progress}%`;
  if (job.status === "done") return "Annotated";
  return "Pending";
}

export function JobRow({ job }: JobRowProps) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-white/60 bg-white/65 px-[18px] py-3.5 shadow-[0_6px_18px_rgba(11,28,77,0.05)] backdrop-blur-[16px]">
      <span
        aria-hidden
        className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClasses[job.status])}
      />

      <div className="min-w-0 flex-1">
        <p className="text-ink mb-0.5 truncate text-[13px] font-semibold">{job.filename}</p>
        <p className="text-ink-subtle font-mono text-[11px]">
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
