import { confidenceTextClass } from "@/components/results/confidence";
import { cn } from "@/lib/cn";
import type { Clip } from "@/types";

interface ClipMetaPanelProps {
  clip: Clip;
}

/** SPEC §5 — a 2-column metadata grid with mono caption labels. */
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
    <div className="glass rounded-card border-hairline bg-panel shadow-glass-sm border px-[22px] py-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-[18px]">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-ink-3 mb-[5px] font-mono text-[10px] tracking-[1.6px]">
              {field.label}
            </dt>
            <dd className={cn("text-ink m-0 text-sm", field.className)}>{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-hairline mt-[18px] flex flex-wrap gap-2 border-t pt-[18px]">
        {clip.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-pill border-accent-line bg-accent-soft text-accent border px-3 py-1 font-mono text-[11px]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
