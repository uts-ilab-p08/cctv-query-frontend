/**
 * Whether decorative motion may run: only when the user hasn't asked for reduced motion.
 * Without matchMedia (tests, very old browsers) the answer is no.
 */
export function prefersMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: no-preference)").matches
    : false;
}
