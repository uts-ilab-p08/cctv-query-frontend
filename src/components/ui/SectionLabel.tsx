import { cn } from "@/lib/cn";

interface SectionLabelProps {
  children: string;
  className?: string;
}

/** Uppercase mono label that heads each list section. */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <h2 className={cn("text-ink-subtle mb-3 font-mono text-[11px] tracking-[1px]", className)}>
      {children}
    </h2>
  );
}
