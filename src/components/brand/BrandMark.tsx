import type { SVGProps } from "react";

import {
  LOCKUP_MARK_OFFSET,
  LOCKUP_VIEWBOX,
  LOCKUP_WORDMARK_OFFSET,
  MARK_PATHS,
  MARK_VIEWBOX,
  WORDMARK_PATHS,
  WORDMARK_VIEWBOX,
  type LogoPath,
} from "./horusPaths";

function Paths({ paths }: { paths: readonly LogoPath[] }) {
  return paths.map((path) => (
    <path key={path.d.slice(0, 24)} d={path.d} fillRule={path.fillRule} />
  ));
}

export interface BrandMarkProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /** px size of the square box the mark fits in. 20px is the documented minimum. */
  size?: number;
}

/**
 * Horus isotipo: the eye of Horus. Inherits colour from `currentColor` — wrap in
 * `text-brand`, which follows the active palette and theme via the `--brand` token.
 * Brand rules: never rotate, outline, recolour parts of, or add effects to the mark.
 */
export function BrandMark({ size = 26, ...props }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <Paths paths={MARK_PATHS} />
    </svg>
  );
}

export interface BrandWordmarkProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /** px height of the lettering; the width follows the logotipo's proportions. */
  height?: number;
}

/** Horus logotipo: the lettering alone, in `currentColor` (usually `text-ink`). */
export function BrandWordmark({ height = 20, ...props }: BrandWordmarkProps) {
  return (
    <svg
      height={height}
      width={(height * WORDMARK_VIEWBOX.width) / WORDMARK_VIEWBOX.height}
      viewBox={`0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <Paths paths={WORDMARK_PATHS} />
    </svg>
  );
}

export interface BrandLockupProps {
  /** px height of the imagotipo; the width follows its proportions. */
  size?: number;
}

/**
 * Horus imagotipo: the eye in the palette's brand colour and the lettering in ink, so
 * both adapt to every palette and to the light and dark themes.
 */
export function BrandLockup({ size = 30 }: BrandLockupProps) {
  return (
    <svg
      role="img"
      aria-label="Horus Assistant"
      height={size}
      width={(size * LOCKUP_VIEWBOX.width) / LOCKUP_VIEWBOX.height}
      viewBox={`0 0 ${LOCKUP_VIEWBOX.width} ${LOCKUP_VIEWBOX.height}`}
      fill="currentColor"
      className="block shrink-0"
    >
      <g
        className="text-brand"
        transform={`translate(${LOCKUP_MARK_OFFSET.x} ${LOCKUP_MARK_OFFSET.y})`}
      >
        <Paths paths={MARK_PATHS} />
      </g>
      <g
        className="text-ink"
        transform={`translate(${LOCKUP_WORDMARK_OFFSET.x} ${LOCKUP_WORDMARK_OFFSET.y})`}
      >
        <Paths paths={WORDMARK_PATHS} />
      </g>
    </svg>
  );
}
