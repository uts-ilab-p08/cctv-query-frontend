"use client";

import { Thumbnail } from "@/components/ui/Thumbnail";
import type { Clip } from "@/types";

interface VideoPlayerProps {
  clip: Clip;
}

const chip =
  "bg-panel-solid text-ink absolute top-3.5 z-1 max-w-[45%] truncate rounded-lg px-[9px] py-1 font-mono text-[11px]";

/**
 * The clip's footage (`video_url`) with the browser's own controls and the thumbnail
 * as its poster. It starts at the moment when the clip knows where that is
 * (`startSeconds`; /clips/{id} doesn't send it yet), else at the start of the video.
 * Without footage, only the still frame shows.
 */
export function VideoPlayer({ clip }: VideoPlayerProps) {
  return (
    <div className="rounded-card glass-card overflow-hidden">
      <div className="relative flex aspect-video items-center justify-center bg-black">
        {clip.videoUrl ? (
          <video
            key={clip.videoUrl}
            src={clip.videoUrl}
            poster={clip.thumbnailUrl}
            aria-label="Clip footage"
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={(event) => {
              if (clip.startSeconds) event.currentTarget.currentTime = clip.startSeconds;
            }}
          />
        ) : (
          <>
            <Thumbnail src={clip.thumbnailUrl} imgClassName="thumb-filter" />
            <span className="absolute bottom-3.5 left-1/2 z-1 -translate-x-1/2 rounded-md border border-white/[0.16] bg-[rgba(12,15,19,0.82)] px-[9px] py-1 font-mono text-[11px] text-white">
              No footage for this clip
            </span>
          </>
        )}

        <span className={`${chip} left-3.5`}>{clip.camera}</span>
        {clip.date || clip.ts ? (
          <span className={`${chip} right-3.5`}>
            {[clip.date, clip.ts].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
