import { confidenceVar } from "@/components/results/confidence";
import { cn } from "@/lib/cn";
import { Thumbnail } from "@/components/ui/Thumbnail";
import type { Clip } from "@/types";

interface MomentCardContentProps {
  clip: Clip;
  /** Extra right padding for the text column (room for an overlaid control). */
  textClassName?: string;
  /** Inside a `group` button: the thumbnail drops its archive filter on hover. */
  revealOnHover?: boolean;
}

/** Inside of a moment card — thumbnail with its score, then title, camera and time.
 *  Shared by the Matching Moments strip and the chat, so a moment always looks the same. */
export function MomentCardContent({ clip, textClassName, revealOnHover }: MomentCardContentProps) {
  return (
    <>
      <div className="relative h-[60px] w-[92px] shrink-0 overflow-hidden rounded-md">
        <Thumbnail
          src={clip.thumbnailUrl}
          imgClassName={cn(
            "thumb-filter",
            revealOnHover && "transition-[filter,opacity] duration-200 group-hover:[filter:none]",
          )}
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
        <div className="text-ink-2 truncate text-[11px]">
          <span>{clip.camera}</span>
          {clip.scene ? <span className="text-ink-3 ml-1">{`· ${clip.scene}`}</span> : null}
        </div>
        <div className="text-ink-3 font-mono text-[10px] leading-[1.3]">{clip.ts}</div>
      </div>
    </>
  );
}
