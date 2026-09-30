"use client";

import { useEffect, useState, type ReactNode } from "react";

import { prefersMotion } from "@/lib/motion";

/** Time between reveal steps. */
const TICK_MS = 30;
/** However long the answer, the reveal takes at most about this long. */
const MAX_DURATION_MS = 1_800;

/** Texts that already finished streaming, so a remount (e.g. navigating back) shows them
 *  whole instead of replaying. Keyed by the message object, which the store never mutates. */
const streamed = new WeakSet<object>();

const plain = (text: string): ReactNode => text;

/** Word boundaries: the reveal steps through whole words, never cutting one in half. */
function wordEnds(text: string): number[] {
  const ends: number[] = [];
  const pattern = /\S+\s*/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) ends.push(match.index + match[0].length);
  return ends;
}

interface StreamedTextProps {
  text: string;
  /** How to render the text, e.g. as markdown. Applied to each partial text as it grows,
   *  so formatting appears while streaming. Plain text by default. */
  format?: (text: string) => ReactNode;
  /** Identity of the message being shown; once streamed, it is never streamed again. */
  streamKey?: object;
}

/**
 * Reveals an assistant answer word by word, like a streamed reply. The backend answers
 * in one piece today, so this is a simulation; a real stream would feed `text` as it
 * grows. Screen readers get the whole text once (the partial copy is hidden from them),
 * and users who prefer reduced motion see it at once.
 */
export function StreamedText({ text, streamKey, format = plain }: StreamedTextProps) {
  const [shown, setShown] = useState<number | null>(() =>
    (streamKey && streamed.has(streamKey)) || !prefersMotion() ? null : 0,
  );

  useEffect(() => {
    if (shown === null) return;
    const ends = wordEnds(text);
    const wordsPerTick = Math.max(1, Math.ceil(ends.length / (MAX_DURATION_MS / TICK_MS)));
    let step = 0;
    const timer = window.setInterval(() => {
      step += wordsPerTick;
      if (step >= ends.length) {
        window.clearInterval(timer);
        if (streamKey) streamed.add(streamKey);
        setShown(null);
      } else {
        setShown(ends[step - 1]);
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
    // Runs once per text: `shown` only drives the render, not the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, streamKey]);

  if (shown === null) return <>{format(text)}</>;

  return (
    <>
      <div className="sr-only">{format(text)}</div>
      <div aria-hidden data-streamed-visible>
        {format(text.slice(0, shown))}
      </div>
    </>
  );
}
