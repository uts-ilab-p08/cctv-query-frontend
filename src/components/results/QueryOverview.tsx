"use client";

import { ArrowRight, Sparkles } from "lucide-react";

import { useAppStore } from "@/store/useAppStore";

interface QueryOverviewProps {
  summary: string;
}

/**
 * SPEC §4 — the 24px brand-gradient badge, the heading and the "Ask more →"
 * pill that is the only way the assistant opens on this screen.
 */
export function QueryOverview({ summary }: QueryOverviewProps) {
  const setChatOpen = useAppStore((state) => state.setChatOpen);

  // Capped at a comfortable reading measure: left to stretch, the row pushed the
  // "Ask more" pill to a far edge and broke the summary into ragged lines.
  return (
    <section className="mb-[22px] max-w-[820px]">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          aria-hidden
          className="surface-brand flex size-6 shrink-0 items-center justify-center rounded-lg"
        >
          <Sparkles size={13} strokeWidth={2.2} className="text-white" />
        </span>
        <h2 className="text-ink text-[15px] font-semibold">Query AI Overview</h2>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="border-accent-line bg-accent-soft text-accent hover:text-accent-strong flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-150"
        >
          Ask more
          <ArrowRight size={13} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className="text-ink-2 text-sm leading-[1.6]">{summary}</p>
    </section>
  );
}
