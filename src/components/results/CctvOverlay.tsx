import type { ReactNode } from "react";

import { cameraDateTime } from "@/lib/cameraTime";

interface CctvOverlayProps {
  camera: string;
  scene?: string;
  /** The video's start on the camera's clock; without it the clock is hidden. */
  captureStartLocal?: string;
  /** Seconds into the video (the same base as `startSeconds` and track times). */
  playhead: number;
  /** A notice shown just above the clock, e.g. that the moment has no footage. */
  note?: ReactNode;
}

/** Fixed white, not themed: the overlay sits on footage, never on the app's surfaces. */
const LABEL = "font-mono text-[13px] leading-none tracking-[1.5px] text-white";

/** The 80% black plate under each label, so it reads over bright and dark frames alike. */
const PLATE = "rounded-md bg-black/80 px-2.5 py-1.5";

const BRACKET = "absolute size-[30px] border-white/85";

/** A faint 1px line every 3px, like a CRT monitor's. */
const SCANLINES =
  "repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.07) 0 1px, transparent 1px 3px)";

/**
 * A CCTV monitor's frame over the player: scanlines, an inset border and corner
 * brackets (decoration only, never in the way of clicks), the camera top left, its
 * scene top right, and the camera's own date and time bottom centre. The elapsed time
 * lives in the player bar below, so it isn't repeated here.
 */
export function CctvOverlay({
  camera,
  scene,
  captureStartLocal,
  playhead,
  note,
}: CctvOverlayProps) {
  const clock = cameraDateTime(captureStartLocal, playhead);

  return (
    <div data-camera-overlay className="pointer-events-none absolute inset-0">
      <div data-cctv-frame aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ backgroundImage: SCANLINES }} />
        <div className="absolute inset-3.5 border border-white/40" />
        <span className={`${BRACKET} top-7 left-7 border-t-2 border-l-2`} />
        <span className={`${BRACKET} top-7 right-7 border-t-2 border-r-2`} />
        <span className={`${BRACKET} bottom-7 left-7 border-b-2 border-l-2`} />
        <span className={`${BRACKET} right-7 bottom-7 border-r-2 border-b-2`} />
      </div>

      <div role="group" aria-label="Camera on the player" className="absolute top-10 left-11">
        <span className={`${LABEL} ${PLATE} inline-block`}>
          CAM {camera === "Unknown" ? "—" : camera}
        </span>
      </div>
      {scene ? (
        <span aria-label="Scene" className={`${LABEL} ${PLATE} absolute top-10 right-11 uppercase`}>
          {scene}
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2">
        {note}
        {clock ? (
          <div
            aria-label="Camera time"
            title="Camera time: the camera's own clock, not converted to yours"
            className={`${PLATE} flex flex-col items-center gap-1 px-3`}
          >
            <time dateTime={`${clock.date}T${clock.time}`} className={`${LABEL} tabular-nums`}>
              {clock.date}&nbsp;&nbsp;{clock.time}
            </time>
            <span className="font-mono text-[9px] tracking-[1.4px] text-white/70">CAMERA TIME</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
