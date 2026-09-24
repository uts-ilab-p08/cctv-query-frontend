import { useEffect, useState } from "react";

import { getTracks } from "@/lib/api/endpoints";
import type { TracksResponse } from "@/lib/api/types";
import type { Clip } from "@/types";

/** A moment with no end from the RAG is highlighted for this long. */
const DEFAULT_MOMENT_SECONDS = 6;

/** Object tracks for the moment on the player; `null` while loading, without footage, or on error. */
export function useMomentTracks(clip: Clip | undefined): TracksResponse | null {
  const [tracks, setTracks] = useState<TracksResponse | null>(null);
  const videoUrl = clip?.videoUrl;
  const id = clip?.id;

  useEffect(() => {
    setTracks(null);
    if (!clip || !videoUrl) return;
    let cancelled = false;
    const start = clip.startSeconds ?? 0;
    getTracks({
      video_id: clip.videoId ?? clip.id,
      start_seconds: start,
      end_seconds: clip.endSeconds ?? start + DEFAULT_MOMENT_SECONDS,
      caption: clip.eventName ?? clip.action,
    })
      .then((response) => {
        if (!cancelled) setTracks(response);
      })
      .catch(() => {
        // No highlight is better than a broken player: the footage still plays.
      });
    return () => {
      cancelled = true;
    };
    // Refetch per moment, not per render of the same clip object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, videoUrl]);

  return tracks;
}
