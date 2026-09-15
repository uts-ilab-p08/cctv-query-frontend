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
 * (carried by the shadow token). `glass` adds the 18px blur and the
 * translateZ(0) compositing layer every glass node needs.
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
        "glass border-hairline border",
        variant === "default" && "rounded-card bg-panel shadow-glass-sm",
        variant === "elevated" && "rounded-card bg-panel-soft shadow-glass",
        className,
      )}
    >
      {children}
    </Component>
  );
}
