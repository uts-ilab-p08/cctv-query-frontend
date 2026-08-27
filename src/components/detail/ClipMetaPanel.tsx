import { confidenceTextClass } from "@/components/results/confidence";
import { cn } from "@/lib/cn";
import type { Clip } from "@/types";

interface ClipMetaPanelProps {
  clip: Clip;
}

export function ClipMetaPanel({ clip }: ClipMetaPanelProps) {
  const fields: Array<{ label: string; value: string; className?: string }> = [
    { label: "TIMESTAMP", value: `${clip.date} · ${clip.ts}`, className: "font-mono" },
    { label: "CAMERA", value: `${clip.camera} (${clip.code})` },
    { label: "PERSPECTIVE", value: clip.perspective },
    { label: "ACTION TYPE", value: clip.action },
    { label: "OBJECTS DETECTED", value: clip.objects },
    {
      label: "CONFIDENCE",
      value: `${clip.confidence}%`,
      className: cn("font-mono", confidenceTextClass(clip.confidence)),
    },
  ];

  return (
    <div className="rounded-xl border border-white/60 bg-white/70 px-[22px] py-5 shadow-[0_8px_22px_rgba(11,28,77,0.07)] backdrop-blur-[16px]">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-[18px]">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-ink-subtle mb-[5px] font-mono text-[10px] tracking-[1px]">
              {field.label}
            </dt>
            <dd className={cn("text-ink m-0 text-sm", field.className)}>{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-border mt-[18px] flex flex-wrap gap-2 border-t pt-[18px]">
        {clip.tags.map((tag) => (
          <span
            key={tag}
            className="border-indigo/25 bg-indigo-wash text-indigo-strong rounded-full border px-3 py-1 font-mono text-[11px]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
