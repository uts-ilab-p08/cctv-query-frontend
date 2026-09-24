import { confidenceVar } from "@/components/results/confidence";
import { cn } from "@/lib/cn";
import { getThumbUrl } from "@/lib/clips";
import type { Clip } from "@/types";

interface MomentCardContentProps {
  clip: Clip;
  /** Extra right padding for the text column (room for an overlaid control). */
  textClassName?: string;
}

/** Inside of a moment card — thumbnail with its score, then title, camera and time.
 *  Shared by the Matching Moments strip and the chat, so a moment always looks the same. */
export function MomentCardContent({ clip, textClassName }: MomentCardContentProps) {
  return (
    <>
      <div className="relative h-[60px] w-[92px] shrink-0 overflow-hidden rounded-md">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getThumbUrl(clip)})`,
            filter: "grayscale(0.55) contrast(1.05) brightness(0.82)",
          }}
        />
        <span
          className="absolute right-1 bottom-1 rounded bg-[rgba(12,15,19,0.80)] px-1.5 py-[2px] font-mono text-[10px]"
          style={{ color: confidenceVar(clip.confidence) }}
        >
          {clip.confidence}%
        </span>
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5 pr-1", textClassName)}>
        <div className="text-ink line-clamp-2 text-[12px] leading-[1.3] font-semibold">
          {clip.eventName ?? clip.action}
        </div>
        <div className="text-ink-2 truncate text-[11px]">{clip.camera}</div>
        <div className="text-ink-3 font-mono text-[10px] leading-[1.3]">{clip.ts}</div>
      </div>
    </>
  );
}
