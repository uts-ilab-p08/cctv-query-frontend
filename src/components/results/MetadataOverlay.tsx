"use client";

import { X } from "lucide-react";

import { confidenceVar } from "@/components/results/confidence";
import { fmtClock } from "@/lib/time";
import type { Clip } from "@/types";

interface MetadataOverlayProps {
  clip: Clip;
  currentTime: number;
  onClose: () => void;
}

interface MetaRow {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}

function rows(clip: Clip, currentTime: number): MetaRow[] {
  return [
    { label: "TIMESTAMP", value: `${clip.date} · ${clip.ts}`, mono: true },
    { label: "CAMERA", value: `${clip.camera} (${clip.code})` },
    { label: "PERSPECTIVE", value: clip.perspective },
    { label: "ACTION TYPE", value: clip.action },
    { label: "OBJECTS DETECTED", value: clip.objects },
    {
      label: "CONFIDENCE",
      value: `${clip.confidence}%`,
      mono: true,
      color: confidenceVar(clip.confidence),
    },
    { label: "PLAYHEAD", value: fmtClock(currentTime), mono: true },
  ];
}

/**
 * Chunk metadata drawn over the video frame. Colors are fixed black/white on
 * purpose (SPEC §2): this overlay must read the same over any frame, so it is
 * one of the documented exceptions to always-tokenized color.
 */
export function MetadataOverlay({ clip, currentTime, onClose }: MetadataOverlayProps) {
  return (
    <div className="absolute right-3 bottom-3 left-3 max-h-[calc(100%-24px)] overflow-y-auto rounded-xl border border-white/[0.18] bg-[rgba(27,33,41,0.80)] px-3.5 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.45)] backdrop-blur-[22px]">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[1.2px] text-white/70">CHUNK METADATA</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close metadata"
          className="text-white/70"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-[18px] gap-y-2.5">
        {rows(clip, currentTime).map((row) => (
          <div key={row.label}>
            <div className="mb-1 font-mono text-[10px] tracking-[1px] text-white/60">
              {row.label}
            </div>
            <div
              className={`text-[13px] text-white ${row.mono ? "font-mono" : ""}`}
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
