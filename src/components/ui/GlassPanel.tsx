import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface GlassPanelProps {
  children: ReactNode;
  /** `elevated` is the brighter, more blurred surface used for feature panels. */
  variant?: "default" | "elevated";
  as?: ElementType;
  className?: string;
}

/**
 * SPEC §8 — one hairline, one soft shadow and a single top inset highlight
 * (carried by the shadow token).
 *
 * Deliberately carries the FILL without `backdrop-filter`: this panel
 * backs repeated items (stat cards, list rows), and the 3–5 blur-layer budget
 * counts every painted node. Surfaces that genuinely need the blur add ``
 * themselves — the top bar, the query field, the assistant overlay.
 */
export function GlassPanel({
  children,
  variant = "default",
  as: Component = "div",
  className,
}: GlassPanelProps) {
  return (
    <Component
      className={cn(
        "border-hairline border",
        variant === "default" && "rounded-card glass-card-flat",
        variant === "elevated" && "rounded-card glass-card-soft",
        className,
      )}
    >
      {children}
    </Component>
  );
}
