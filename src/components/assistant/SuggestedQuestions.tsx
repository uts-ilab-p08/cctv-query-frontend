"use client";

import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { GLOW_LAP_MS, useSequentialGlow } from "@/lib/useSequentialGlow";

/**
 * Props for the suggested question that glows now (see `useSequentialGlow`): the
 * `suggestion-glow` border light, lapping in step with the hook.
 */
export function glowProps(glowing: boolean): { className?: string; style?: CSSProperties } {
  return glowing
    ? {
        className: "suggestion-glow",
        style: { "--glow-lap": `${GLOW_LAP_MS}ms` } as CSSProperties,
      }
    : {};
}

const GROUP_CORNERS = {
  lg: { top: "rounded-t-lg", bottom: "rounded-b-lg" },
  chip: { top: "rounded-t-chip", bottom: "rounded-b-chip" },
} as const;

/**
 * A suggested question as one row of a single block: rows touch, sharing a 1px border
 * (`-mt-px`), and only the block's outer corners are rounded. A hovered row rises above
 * its neighbours so its whole border shows.
 */
export function groupedItemClass(
  index: number,
  count: number,
  corners: keyof typeof GROUP_CORNERS,
) {
  return cn(
    "relative rounded-none hover:z-[1]",
    index > 0 && "-mt-px",
    index === 0 && GROUP_CORNERS[corners].top,
    index === count - 1 && GROUP_CORNERS[corners].bottom,
  );
}

/**
 * A suggested question's text plus the arrow that slides in on hover or keyboard focus,
 * saying "send this". The button must carry `group`.
 */
export function SuggestionLabel({ text }: { text: string }) {
  return (
    <>
      <span className="min-w-0 flex-1">{text}</span>
      <ArrowRight
        size={14}
        strokeWidth={2.2}
        aria-hidden
        className="text-accent-strong shrink-0 -translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      />
    </>
  );
}

/** Widths of the placeholder "text" lines, so the rows don't look identical. */
const SKELETON_WIDTHS = ["w-[72%]", "w-[58%]", "w-[66%]"];

/**
 * Placeholder for the suggested questions on their very first load: the same grouped rows,
 * each with a pulsing line where the question will be (see `useLatchedSuggestions`).
 */
export function SuggestionsSkeleton({
  corners,
  rowClassName,
  className,
}: {
  corners: Parameters<typeof groupedItemClass>[2];
  /** The rows' own look, matching the questions they stand in for. */
  rowClassName: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading suggested questions"
      className={cn("flex flex-col gap-2", className)}
    >
      <p className="text-ink-3 text-[12px]">Suggested questions</p>
      <div aria-hidden className="flex flex-col">
        {SKELETON_WIDTHS.map((width, index) => (
          <div
            key={width}
            data-skeleton-row
            className={cn(
              "flex items-center px-3 py-3",
              rowClassName,
              groupedItemClass(index, SKELETON_WIDTHS.length, corners),
            )}
          >
            <span className={cn("bg-ink-3/25 h-3 animate-pulse rounded-full", width)} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SuggestedQuestionsProps {
  questions: readonly string[];
  onAsk: (question: string) => void;
  /** The previous questions, kept on screen (disabled) while the next ones load. */
  stale?: boolean;
  className?: string;
}

/** SPEC §6 — the empty state: four left-aligned buttons. */
export function SuggestedQuestions({
  questions,
  onAsk,
  stale = false,
  className,
}: SuggestedQuestionsProps) {
  const glowing = useSequentialGlow(stale ? 0 : questions.length);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-ink-3 text-xs">Suggested questions</p>
      <div
        role="group"
        aria-label="Suggested questions"
        aria-busy={stale || undefined}
        className="flex flex-col"
      >
        {questions.map((question, index) => {
          const glow = glowProps(index === glowing);
          return (
            <button
              key={question}
              type="button"
              onClick={() => onAsk(question)}
              disabled={stale}
              style={glow.style}
              className={cn(
                "group glass-card-flat text-ink-2 hover:border-accent-line hover:bg-accent-soft hover:text-ink disabled:hover:text-ink-2 flex cursor-pointer items-center gap-2 px-3 py-2.5 text-left font-sans text-[13px] transition-[color,background-color,border-color,opacity] duration-150 disabled:cursor-default disabled:opacity-55 disabled:hover:bg-transparent",
                groupedItemClass(index, questions.length, "chip"),
                glow.className,
              )}
            >
              <SuggestionLabel text={question} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
