import { cn } from "@/lib/cn";

interface SectionLabelProps {
  children: string;
  className?: string;
}

/** Uppercase mono label that heads each list section (SPEC §9: 10–11px, +1.6px tracking). */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <h2 className={cn("text-ink-3 mb-3 font-mono text-[11px] tracking-[1.6px]", className)}>
      {children}
    </h2>
  );
}
