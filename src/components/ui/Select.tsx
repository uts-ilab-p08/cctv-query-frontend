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
        "border-border-input text-ink focus:border-indigo-strong h-10 w-full cursor-pointer rounded-lg border bg-white px-2.5 font-sans text-[13px] transition-colors duration-150",
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
