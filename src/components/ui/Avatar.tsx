import { cn } from "@/lib/cn";

interface AvatarProps {
  /** One or two letters, e.g. from `nameFromEmail(...).initials`. */
  initials: string;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * The user's initials on the brand surface. Decorative: whatever sits next to it (the name,
 * the email, a link's label) is what screen readers read.
 */
export function Avatar({ initials, size = "sm", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "surface-action flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.5px] select-none",
        size === "sm" ? "size-8 text-[12px]" : "size-20 text-[26px]",
        className,
      )}
    >
      {initials}
    </span>
  );
}
