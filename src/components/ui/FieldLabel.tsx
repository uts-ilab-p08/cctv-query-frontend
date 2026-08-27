import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface FieldLabelProps {
  children: ReactNode;
  htmlFor?: string;
  as?: "label" | "div";
  className?: string;
}

export function FieldLabel({ children, htmlFor, as = "label", className }: FieldLabelProps) {
  const classes = cn("mb-2 block text-xs text-ink-muted", className);

  if (as === "div") {
    return <div className={classes}>{children}</div>;
  }

  return (
    <label htmlFor={htmlFor} className={classes}>
      {children}
    </label>
  );
}
