"use client";

import Link from "next/link";

import { confidenceBorderClass, confidenceTextClass } from "@/components/results/confidence";
import { getThumbUrl } from "@/lib/clips";
import { cn } from "@/lib/cn";
import type { Clip } from "@/types";

interface ClipCardProps {
  clip: Clip;
}

export function ClipCard({ clip }: ClipCardProps) {
  return (
    <Link
      href={`/clips/${clip.id}`}
      className="block overflow-hidden rounded-xl border border-white/60 bg-white/70 no-underline shadow-[0_8px_22px_rgba(11,28,77,0.07)] backdrop-blur-[14px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(11,28,77,0.12)]"
    >
      <div className="relative h-[150px]">
        <div
          aria-hidden
          className="thumb-filter absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${getThumbUrl(clip)})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,28,77,0.05),rgba(11,28,77,0.35))]"
        />
        <span className="absolute top-2 left-2 rounded-[4px] bg-[rgba(11,28,77,0.75)] px-[7px] py-[3px] font-mono text-[10px] text-white">
          {clip.code}
        </span>
        <span
          className={cn(
            "absolute top-2 right-2 rounded-[4px] border bg-white px-[7px] py-[3px] font-mono text-[10px]",
            confidenceBorderClass(clip.confidence),
            confidenceTextClass(clip.confidence),
          )}
        >
          {clip.confidence}%
        </span>
      </div>

      <div className="px-3.5 py-[13px]">
        <p className="text-ink mb-1 text-sm font-semibold">{clip.action}</p>
        <p className="text-ink-subtle mb-2 font-mono text-xs">
          {clip.camera} · {clip.ts}
        </p>
        <p className="text-ink-muted mb-2.5 text-xs">{clip.objects}</p>
        <span className="text-indigo-strong text-xs">View detail →</span>
      </div>
    </Link>
  );
}
