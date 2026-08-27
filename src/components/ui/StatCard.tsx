import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  /** `compact` is the tighter pipeline variant. */
  size?: "default" | "compact";
}

export function StatCard({ label, value, size = "default" }: StatCardProps) {
  return (
    <GlassPanel className={size === "default" ? "p-[18px]" : "p-4"}>
      <div
        className={cn(
          "text-ink-subtle mb-1.5 font-mono tracking-[1px]",
          size === "default" ? "mb-2 text-[11px]" : "text-[10px]",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "text-navy-deep font-bold",
          size === "default" ? "text-[26px]" : "text-[22px]",
        )}
      >
        {value}
      </div>
    </GlassPanel>
  );
}
