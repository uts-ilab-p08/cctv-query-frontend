"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { confidenceVar } from "@/components/results/confidence";
import { fmtElapsed } from "@/lib/time";
import type { Clip } from "@/types";

interface MetadataOverlayProps {
  clip: Clip;
  /** Playhead, in seconds into the video. */
  currentTime: number;
  onClose: () => void;
}

/** One label + value. Labels differ from values by type (mono, small, tracked), not by a
 *  dimmer colour: over the video every text needs the full-contrast ink. */
function Field({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span data-meta-label className="text-ink font-mono text-[10px] tracking-[1.2px]">
        {label}
      </span>
      <div className={`text-ink text-[13px] leading-[1.45] ${mono ? "font-mono" : ""}`}>
        {children}
      </div>
    </div>
  );
}

/** A group of fields; groups are split by a hairline. */
function Section({ children }: { children: ReactNode }) {
  return (
    <div className="border-hairline flex flex-col gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      {children}
    </div>
  );
}

/**
 * Chunk metadata as a column floating against the video's right edge, top to bottom:
 * what happened (and how sure the match is), where, when, then the details. It sits on
 * `glass-overlay`: the palette's panel with a little of the frame showing through and
 * a strong blur. That fill is contrast-checked for every palette over a pure white and
 * a pure black frame (theme-contrast.test.ts), so all its text uses `text-ink`.
 */
export function MetadataOverlay({ clip, currentTime, onClose }: MetadataOverlayProps) {
  const when = [clip.date, clip.ts].filter(Boolean).join(" · ");
  const camera =
    clip.code && clip.code !== clip.camera ? `${clip.camera} (${clip.code})` : clip.camera;

  return (
    <div
      role="region"
      aria-label="Chunk metadata"
      className="glass-overlay absolute top-3 right-3 bottom-3 z-10 flex w-[260px] max-w-[calc(100%-24px)] flex-col overflow-hidden rounded-xl"
    >
      <div className="border-hairline flex shrink-0 items-center justify-between border-b px-3.5 py-2.5">
        <span className="text-ink font-mono text-[11px] tracking-[1.2px]">CHUNK METADATA</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close metadata"
          className="text-ink cursor-pointer rounded-md p-0.5 opacity-80 transition-opacity duration-150 hover:opacity-100"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
        <Section>
          <Field label="EVENT">
            <span className="text-[14px] font-semibold">{clip.eventName ?? clip.action}</span>
          </Field>
          <Field label="CONFIDENCE" mono>
            <div className="flex items-center gap-2.5">
              <span>{clip.confidence}%</span>
              {/* The colour lives in the bar (graphics need 3:1), never in the text. */}
              <div
                role="meter"
                aria-label="Confidence"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={clip.confidence}
                className="bg-ink/15 h-1.5 flex-1 overflow-hidden rounded-full"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, clip.confidence))}%`,
                    background: confidenceVar(clip.confidence),
                  }}
                />
              </div>
            </div>
          </Field>
        </Section>

        <Section>
          <Field label="CAMERA">{camera}</Field>
          {clip.scene ? <Field label="SCENE">{clip.scene}</Field> : null}
        </Section>

        <Section>
          {when ? (
            <Field label="TIMESTAMP" mono>
              {when}
            </Field>
          ) : null}
          <Field label="PLAYHEAD" mono>
            {fmtElapsed(currentTime)}
          </Field>
        </Section>

        <Section>
          <Field label="OBJECTS DETECTED">{clip.objects}</Field>
          {clip.description ? <Field label="DESCRIPTION">{clip.description}</Field> : null}
        </Section>
      </div>
    </div>
  );
}
