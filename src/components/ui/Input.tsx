"use client";

import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ mono = false, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "rounded-chip glass-card-flat text-ink placeholder:text-ink-3 focus:border-accent-line h-10 w-full px-3 text-[13px] transition-colors duration-150",
        mono ? "font-mono" : "font-sans",
        className,
      )}
      {...props}
    />
  );
}
