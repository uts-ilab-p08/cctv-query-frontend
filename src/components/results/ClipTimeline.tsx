import Link from "next/link";

import { confidenceBgClass, confidenceTextClass } from "@/components/results/confidence";
import { getThumbUrl } from "@/lib/clips";
import { cn } from "@/lib/cn";
import type { Clip } from "@/types";

interface ClipTimelineProps {
  clips: Clip[];
}

export function ClipTimeline({ clips }: ClipTimelineProps) {
  return (
    <div className="relative pl-[18px]">
      <span aria-hidden className="bg-track absolute top-1.5 bottom-1.5 left-1 w-0.5" />
      <ul className="flex list-none flex-col gap-3.5 p-0">
        {clips.map((clip) => (
          <li key={clip.id} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 -left-[18px] size-[9px] -translate-y-1/2 rounded-full",
                confidenceBgClass(clip.confidence),
              )}
            />
            <Link
              href={`/clips/${clip.id}`}
              className="rounded-card border-hairline bg-panel shadow-glass-sm hover:border-hairline-strong flex items-center gap-4 border px-4 py-3 no-underline transition-colors duration-150"
            >
              <span
                aria-hidden
                className="thumb-filter h-14 w-[88px] shrink-0 rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${getThumbUrl(clip)})` }}
              />
              <span className="text-ink-2 w-[82px] shrink-0 font-mono text-[13px]">{clip.ts}</span>
              <span className="min-w-0 flex-1">
                <span className="text-ink block text-sm font-semibold">{clip.action}</span>
                <span className="text-ink-3 block text-xs">
                  {clip.camera} · {clip.objects}
                </span>
              </span>
              <span
                className={cn("shrink-0 font-mono text-xs", confidenceTextClass(clip.confidence))}
              >
                {clip.confidence}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
