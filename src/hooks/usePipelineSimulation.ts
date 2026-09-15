"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store/useAppStore";

/** Interval between queue ticks, in milliseconds. */
const TICK_MS = 1400;

/**
 * Drives the annotation queue forward while the pipeline screen is mounted:
 * processing jobs gain progress, completed ones free a slot, and the next
 * pending job is promoted. Cleans its interval up on unmount.
 */
export function usePipelineSimulation(): void {
  const advancePipeline = useAppStore((state) => state.advancePipeline);

  useEffect(() => {
    const timer = window.setInterval(advancePipeline, TICK_MS);
    return () => window.clearInterval(timer);
  }, [advancePipeline]);
}
