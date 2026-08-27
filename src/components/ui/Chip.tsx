"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ChipTone = "navy" | "indigo";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  /** `navy` fills solid when active; `indigo` uses the wash treatment. */
  tone?: ChipTone;
  mono?: boolean;
}

export function Chip({
  children,
  active = false,
  tone = "indigo",
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
        !active &&
          "border-border-input text-ink-muted hover:border-indigo-strong hover:text-indigo-strong bg-white",
        active && tone === "navy" && "border-navy bg-navy text-white",
        active && tone === "indigo" && "border-indigo-strong bg-indigo-wash text-indigo-strong",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
