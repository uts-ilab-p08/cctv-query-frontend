"use client";

import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly string[];
}

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "rounded-chip border-hairline-strong bg-panel-solid text-ink focus:border-accent-line h-10 w-full cursor-pointer border px-2.5 font-sans text-[13px] transition-colors duration-150",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
