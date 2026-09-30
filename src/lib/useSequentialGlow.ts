import { useEffect, useState } from "react";

import { prefersMotion } from "@/lib/motion";

/** How long the glow takes to go once around one item's border. */
export const GLOW_LAP_MS = 2_600;

/**
 * Which item of a list glows now: the first, then each next one after a full lap,
 * wrapping around, so only one glows at a time. `null` when the list is empty or the
 * user prefers reduced motion. A new list starts again from the first item.
 */
export function useSequentialGlow(count: number, lapMs = GLOW_LAP_MS): number | null {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (count === 0 || !prefersMotion()) {
      setActive(null);
      return;
    }
    setActive(0);
    const timer = window.setInterval(() => {
      setActive((index) => ((index ?? -1) + 1) % count);
    }, lapMs);
    return () => window.clearInterval(timer);
  }, [count, lapMs]);

  return active;
}
