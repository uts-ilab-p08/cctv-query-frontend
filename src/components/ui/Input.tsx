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
        "border-border-input text-ink placeholder:text-ink-subtle focus:border-indigo-strong h-10 w-full rounded-lg border bg-white px-3 text-[13px] transition-colors duration-150",
        mono ? "font-mono" : "font-sans",
        className,
      )}
      {...props}
    />
  );
}
