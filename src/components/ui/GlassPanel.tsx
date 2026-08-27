import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface GlassPanelProps {
  children: ReactNode;
  /** `elevated` is the brighter, more blurred surface used for feature panels. */
  variant?: "default" | "elevated";
  as?: ElementType;
  className?: string;
}

export function GlassPanel({
  children,
  variant = "default",
  as: Component = "div",
  className,
}: GlassPanelProps) {
  return (
    <Component
      className={cn(
        "border shadow-[0_8px_24px_rgba(11,28,77,0.06)] backdrop-blur-[16px]",
        variant === "default" && "rounded-xl border-white/60 bg-white/65",
        variant === "elevated" &&
          "rounded-2xl border-white/70 bg-white/70 shadow-[0_16px_40px_rgba(99,102,241,0.1)] backdrop-blur-[20px]",
        className,
      )}
    >
      {children}
    </Component>
  );
}
