"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient text-white border-transparent shadow-[0_6px_16px_rgba(67,56,202,0.3)] hover:shadow-[0_10px_24px_rgba(67,56,202,0.38)]",
  secondary: "bg-white/70 text-ink-muted border-border hover:bg-white hover:text-ink",
  ghost: "bg-transparent text-ink-muted border-transparent hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-6 text-sm font-semibold",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border font-sans transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
