"use client";

import { useEffect, useState, type RefObject } from "react";

import type { TracksResponse } from "@/lib/api/types";
import { boxAt } from "@/lib/tracks";

interface DetectionOverlayProps {
  tracks: TracksResponse;
  videoRef: RefObject<HTMLVideoElement | null>;
}

/** Label chip height and text size, in source-frame pixels (they scale with the video). */
const CHIP_H = 34;
const FONT = 22;

/**
 * Highlights the tracked objects over the footage. The SVG's viewBox is the source
 * frame, and `xMidYMid meet` letterboxes exactly like the video's `object-contain`,
 * so boxes in source pixels land on the right spot at any player size. Time is read
 * from the <video> every animation frame; `boxAt` interpolates between keyframes.
 * Colours are fixed on purpose: like the other chips over the frame, they must read
 * over any footage.
 */
export function DetectionOverlay({ tracks, videoRef }: DetectionOverlayProps) {
  const [time, setTime] = useState(() => videoRef.current?.currentTime ?? 0);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) setTime(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [videoRef]);

  const visible = tracks.objects.flatMap((object) => {
    const box = boxAt(object.boxes, time);
    return box ? [{ object, box }] : [];
  });
  const suffix = tracks.simulated ? " (simulated)" : "";

  return (
    <svg
      role="img"
      aria-label={`Detected objects${visible.length ? `: ${visible.map((v) => v.object.label).join(", ")}` : ""}${suffix}`}
      viewBox={`0 0 ${tracks.frame_width} ${tracks.frame_height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {visible.map(({ object, box }) => {
        const confidence = box.confidence != null ? ` ${Math.round(box.confidence * 100)}%` : "";
        const label = `${object.label}${confidence}${tracks.simulated ? " · SIMULATED" : ""}`;
        const chipY = Math.max(0, box.y - CHIP_H - 4);
        return (
          <g key={object.object_id}>
            {/* Dark halo under the accent stroke keeps the box visible on bright footage. */}
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={8}
              fill="none"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={9}
            />
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={8}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={4}
            />
            <rect
              x={box.x}
              y={chipY}
              width={label.length * FONT * 0.6 + 20}
              height={CHIP_H}
              rx={6}
              fill="rgba(12,15,19,0.85)"
            />
            <text
              x={box.x + 10}
              y={chipY + CHIP_H / 2 + FONT / 3}
              fontSize={FONT}
              fill="#ffffff"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
