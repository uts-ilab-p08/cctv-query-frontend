"use client";

import { X } from "lucide-react";

import { confidenceVar } from "@/components/results/confidence";
import { fmtClock } from "@/lib/time";
import type { Clip } from "@/types";

interface MetadataOverlayProps {
  clip: Clip;
  currentTime: number;
  /** Playhead formatter — wall clock for the demo window, elapsed time for real video. */
  formatTime?: (sec: number) => string;
  onClose: () => void;
}

interface MetaRow {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}

function rows(clip: Clip, currentTime: number, formatTime: (sec: number) => string): MetaRow[] {
  return [
    {
      label: "TIMESTAMP",
      // RAG results have no date yet — don't render a dangling separator.
      value: [clip.date, clip.ts].filter(Boolean).join(" · "),
      mono: true,
    },
    { label: "CAMERA", value: `${clip.camera} (${clip.code})` },
    ...(clip.scene ? [{ label: "SCENE", value: clip.scene }] : []),
    { label: "PERSPECTIVE", value: clip.perspective },
    { label: "ACTION TYPE", value: clip.action },
    { label: "OBJECTS DETECTED", value: clip.objects },
    {
      label: "CONFIDENCE",
      value: `${clip.confidence}%`,
      mono: true,
      color: confidenceVar(clip.confidence),
    },
    { label: "PLAYHEAD", value: formatTime(currentTime), mono: true },
  ];
}

/**
 * Chunk metadata drawn over the video frame, on the palette's floating surface
 * (`glass-panel`: --panel-strong at 94–96% opacity + blur), so it follows the active
 * palette and theme. That near-opaque fill is what keeps it legible over any frame —
 * the reason it used to be a fixed dark colour — and the text tokens on it are
 * contrast-checked for every palette (theme-contrast.test.ts).
 */
export function MetadataOverlay({
  clip,
  currentTime,
  formatTime = fmtClock,
  onClose,
}: MetadataOverlayProps) {
  return (
    <div
      role="region"
      aria-label="Chunk metadata"
      className="glass-panel absolute right-3 bottom-3 left-3 max-h-[calc(100%-24px)] overflow-y-auto rounded-xl px-3.5 py-3"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-ink-2 font-mono text-[11px] tracking-[1.2px]">CHUNK METADATA</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close metadata"
          className="text-ink-2 hover:text-ink cursor-pointer transition-colors duration-150"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-[18px] gap-y-2.5">
        {rows(clip, currentTime, formatTime).map((row) => (
          <div key={row.label}>
            <div className="text-ink-3 mb-1 font-mono text-[10px] tracking-[1px]">{row.label}</div>
            <div
              className={`text-ink text-[13px] ${row.mono ? "font-mono" : ""}`}
              style={row.color ? { color: row.color } : undefined}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
