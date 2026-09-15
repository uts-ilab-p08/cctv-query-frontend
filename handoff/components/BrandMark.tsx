import type { SVGProps } from "react";

export interface BrandMarkProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /** px size of the square mark. 20px is the documented minimum. */
  size?: number;
}

/**
 * CCTV AI logo: aperture + magnifier on a 24px grid, uniform 2px stroke.
 * Inherits colour from `currentColor` — wrap in `text-brand` for the violet mark.
 * Brand rules: never rotate, refill the ring, change the stroke weight, or add effects.
 */
export function BrandMark({ size = 26, ...props }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="10.5" cy="10.5" r="7.5" />
      <line x1="16" y1="16" x2="21" y2="21" />
      <line x1="10.5" y1="3" x2="16" y2="8" />
      <line x1="18" y1="10.5" x2="13" y2="16" />
      <line x1="10.5" y1="18" x2="5" y2="13" />
      <line x1="3" y1="10.5" x2="8" y2="5" />
      <circle cx="10.5" cy="10.5" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BrandLockup({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={size} className="text-brand shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-ink text-[15px] font-bold tracking-[0.2px]">CCTV AI</span>
        <span className="text-ink-3 font-mono text-[9px] tracking-[1.2px]">ASSISTANT</span>
      </div>
    </div>
  );
}
