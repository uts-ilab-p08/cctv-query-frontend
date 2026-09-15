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
      className="glass rounded-card border-hairline bg-panel shadow-glass-sm hover:border-hairline-strong block overflow-hidden border no-underline transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="relative h-[150px]">
        <div
          aria-hidden
          className="thumb-filter absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${getThumbUrl(clip)})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent, var(--scrim))" }}
        />
        <span className="bg-panel-solid text-ink absolute top-2 left-2 rounded-[4px] px-[7px] py-[3px] font-mono text-[10px]">
          {clip.code}
        </span>
        <span
          className={cn(
            "bg-panel-solid absolute top-2 right-2 rounded-[4px] border px-[7px] py-[3px] font-mono text-[10px]",
            confidenceBorderClass(clip.confidence),
            confidenceTextClass(clip.confidence),
          )}
        >
          {clip.confidence}%
        </span>
      </div>

      <div className="px-3.5 py-[13px]">
        <p className="text-ink mb-1 text-sm font-semibold">{clip.action}</p>
        <p className="text-ink-3 mb-2 font-mono text-xs">
          {clip.camera} · {clip.ts}
        </p>
        <p className="text-ink-2 mb-2.5 text-xs">{clip.objects}</p>
        <span className="text-accent text-xs">View detail →</span>
      </div>
    </Link>
  );
}
