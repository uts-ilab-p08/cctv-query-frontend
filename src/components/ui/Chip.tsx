"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ChipTone = "solid" | "accent";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  /** `solid` fills with the action gradient; `accent` uses the soft wash. */
  tone?: ChipTone;
  mono?: boolean;
}

export function Chip({
  children,
  active = false,
  tone = "accent",
  mono = true,
  className,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors duration-150",
        mono ? "font-mono" : "font-sans",
        !active && "glass-card-flat text-ink-2 hover:text-ink",
        active && tone === "solid" && "surface-action border-transparent",
        active && tone === "accent" && "border-accent-line bg-accent-soft text-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
